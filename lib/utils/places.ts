// Google Places API (New) — Text Search
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
// Requires GOOGLE_PLACES_API_KEY in env. Returns [] silently if key is missing.

export interface NearbyCompetitor {
  name: string
  rating: number | null
  review_count: number | null
  price_level: string | null // 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' etc.
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'

export async function getNearbyCompetitors(
  address: string,
  cuisineTypes: string[],
): Promise<NearbyCompetitor[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey || !address) return []

  const primaryCuisine = cuisineTypes[0] ?? 'restaurant'
  const query = `${primaryCuisine} restaurants near ${address}`

  try {
    const res = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Only request fields we actually use — keeps cost low (Basic SKU only)
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.priceLevel',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
        languageCode: 'en',
      }),
      // 4 s timeout — don't block content generation if Places is slow
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return []
    const json = await res.json() as { places?: Array<{
      displayName?: { text?: string }
      rating?: number
      userRatingCount?: number
      priceLevel?: string
    }> }

    return (json.places ?? []).map(p => ({
      name: p.displayName?.text ?? 'Unknown',
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      price_level: p.priceLevel ?? null,
    }))
  } catch {
    // Network error, timeout, or bad JSON — fail silently
    return []
  }
}
