-- Add daily revenue target to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS daily_revenue_target numeric;

-- Dashboard overview RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(
  p_restaurant_id uuid,
  p_period_start  timestamptz,
  p_period_end    timestamptz,
  p_prior_start   timestamptz,
  p_prior_end     timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'current_revenue', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0),
    'prior_revenue', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_prior_start AND created_at < p_prior_end
    ), 0),
    'current_orders', COALESCE((
      SELECT COUNT(*) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0)::int,
    'prior_orders', COALESCE((
      SELECT COUNT(*) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_prior_start AND created_at < p_prior_end
    ), 0)::int,
    'cancellations_count', COALESCE((
      SELECT COUNT(*) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'cancelled'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0)::int,
    'cancelled_revenue', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'cancelled'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0),
    'tip_total', COALESCE((
      SELECT SUM(fee_amount) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0),
    'tip_subtotal', COALESCE((
      SELECT SUM(subtotal) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0),
    'avg_prep_minutes', COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60)
      FROM orders
      WHERE restaurant_id = p_restaurant_id AND status IN ('ready','completed')
        AND created_at >= p_period_start AND created_at < p_period_end
        AND updated_at > created_at
    ), 0),
    'prior_avg_prep', COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60)
      FROM orders
      WHERE restaurant_id = p_restaurant_id AND status IN ('ready','completed')
        AND created_at >= p_prior_start AND created_at < p_prior_end
        AND updated_at > created_at
    ), 0),
    'rolling_30d_aov', COALESCE((
      SELECT AVG(total_amount) FROM orders
      WHERE restaurant_id = p_restaurant_id AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
    ), 0),
    'new_customers', COALESCE((
      SELECT COUNT(*) FROM customers
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= p_period_start AND created_at < p_period_end
    ), 0)::int,
    'new_customer_aov', COALESCE((
      SELECT AVG(o.total_amount)
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.restaurant_id = p_restaurant_id AND o.status = 'completed'
        AND o.created_at >= p_period_start AND o.created_at < p_period_end
        AND c.created_at >= p_period_start AND c.created_at < p_period_end
    ), 0),
    'returning_orders', COALESCE((
      SELECT COUNT(*)
      FROM orders o
      WHERE o.restaurant_id = p_restaurant_id AND o.status = 'completed'
        AND o.created_at >= p_period_start AND o.created_at < p_period_end
        AND o.customer_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders o2
          WHERE o2.customer_id = o.customer_id
            AND o2.restaurant_id = p_restaurant_id
            AND o2.status = 'completed'
            AND o2.created_at < p_period_start
        )
    ), 0)::int,
    'channel_breakdown', (
      SELECT COALESCE(json_agg(ch), '[]'::json)
      FROM (
        SELECT order_type, COUNT(*)::int AS count, COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'completed'
          AND created_at >= p_period_start AND created_at < p_period_end
        GROUP BY order_type
      ) ch
    ),
    'status_breakdown', (
      SELECT COALESCE(json_agg(sb), '[]'::json)
      FROM (
        SELECT status, COUNT(*)::int AS count
        FROM orders
        WHERE restaurant_id = p_restaurant_id
          AND created_at >= p_period_start AND created_at < p_period_end
        GROUP BY status
      ) sb
    ),
    'hourly_current', (
      SELECT COALESCE(json_agg(h ORDER BY h.hour), '[]'::json)
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
          COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'completed'
          AND created_at >= p_period_start AND created_at < p_period_end
        GROUP BY 1
      ) h
    ),
    'hourly_prior', (
      SELECT COALESCE(json_agg(h ORDER BY h.hour), '[]'::json)
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
          COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'completed'
          AND created_at >= p_prior_start AND created_at < p_prior_end
        GROUP BY 1
      ) h
    ),
    'top_items', (
      SELECT COALESCE(json_agg(ti), '[]'::json)
      FROM (
        SELECT oi.item_name_snapshot AS name,
          SUM(oi.quantity)::int AS total_qty,
          COALESCE(SUM(oi.line_total),0) AS total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.restaurant_id = p_restaurant_id AND o.status = 'completed'
          AND o.created_at >= p_period_start AND o.created_at < p_period_end
        GROUP BY oi.item_name_snapshot
        ORDER BY total_revenue DESC
        LIMIT 5
      ) ti
    ),
    'bottom_item', (
      SELECT row_to_json(bi)
      FROM (
        SELECT oi.item_name_snapshot AS name,
          SUM(oi.quantity)::int AS total_qty,
          COALESCE(SUM(oi.line_total),0) AS total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.restaurant_id = p_restaurant_id AND o.status = 'completed'
          AND o.created_at >= p_period_start AND o.created_at < p_period_end
        GROUP BY oi.item_name_snapshot
        HAVING SUM(oi.quantity) < 3
        ORDER BY total_revenue ASC
        LIMIT 1
      ) bi
    ),
    'low_sellthrough_7d', (
      SELECT row_to_json(ls)
      FROM (
        SELECT oi.item_name_snapshot AS name,
          SUM(oi.quantity)::int AS total_qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.restaurant_id = p_restaurant_id AND o.status = 'completed'
          AND o.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY oi.item_name_snapshot
        HAVING SUM(oi.quantity) < 3
        ORDER BY total_qty ASC
        LIMIT 1
      ) ls
    ),
    'cancellations_last_hour', json_build_object(
      'count', COALESCE((
        SELECT COUNT(*)::int FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'cancelled'
          AND created_at >= NOW() - INTERVAL '60 minutes'
      ), 0),
      'revenue', COALESCE((
        SELECT SUM(total_amount) FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'cancelled'
          AND created_at >= NOW() - INTERVAL '60 minutes'
      ), 0)
    ),
    'overdue_preparing', (
      SELECT row_to_json(op)
      FROM (
        SELECT id, order_number, order_type,
          ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::int AS minutes_ago
        FROM orders
        WHERE restaurant_id = p_restaurant_id AND status = 'preparing'
          AND created_at < NOW() - INTERVAL '25 minutes'
        ORDER BY created_at ASC
        LIMIT 1
      ) op
    ),
    'avg_prep_today', COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60)
      FROM orders
      WHERE restaurant_id = p_restaurant_id AND status IN ('ready','completed')
        AND created_at >= CURRENT_DATE
        AND updated_at > created_at
    ), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
