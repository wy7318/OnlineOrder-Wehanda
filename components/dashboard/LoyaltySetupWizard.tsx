'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Gift, Star, Percent, Clock, Zap, CakeSlice, Rocket, Check } from 'lucide-react'
import type { LoyaltyProgram } from '@/lib/types'

interface Props {
  restaurantId: string
  existing: LoyaltyProgram | null
  onSaved: (program: LoyaltyProgram) => void
  onClose: () => void
}

interface WizardForm {
  program_name: string
  points_per_dollar: number
  points_to_redeem: number
  minimum_points_to_redeem: number
  welcome_bonus_points: number
  birthday_bonus_points: number
  points_expiry_days: number | null
}

const TOTAL_STEPS = 8

function PillButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 rounded-2xl text-sm font-bold transition border-2 ${
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

function CustomNumberInput({
  value, onChange, prefix = '', suffix = '', min = 1,
}: {
  value: number | null
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  min?: number
}) {
  return (
    <div className="flex items-center gap-2 mt-3">
      {prefix && <span className="text-sm font-medium text-gray-500">{prefix}</span>}
      <input
        type="number"
        min={min}
        value={value ?? ''}
        onChange={e => onChange(Math.max(min, parseInt(e.target.value) || min))}
        placeholder="Enter amount"
        className="w-28 border-2 border-brand-300 rounded-xl px-3 py-2 text-sm font-bold text-brand-700 focus:outline-none focus:border-brand-500 text-center"
      />
      {suffix && <span className="text-sm font-medium text-gray-500">{suffix}</span>}
    </div>
  )
}

export default function LoyaltySetupWizard({ restaurantId, existing, onSaved, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [customEarnActive, setCustomEarnActive] = useState(false)
  const [customRedeemActive, setCustomRedeemActive] = useState(false)
  const [customMinActive, setCustomMinActive] = useState(false)
  const [customWelcomeActive, setCustomWelcomeActive] = useState(false)
  const [customBirthdayActive, setCustomBirthdayActive] = useState(false)
  const [expiryEnabled, setExpiryEnabled] = useState(existing ? existing.points_expiry_days !== null : false)
  const [customExpiryDays, setCustomExpiryDays] = useState(existing?.points_expiry_days ?? 365)

  const [form, setForm] = useState<WizardForm>({
    program_name: existing?.program_name ?? 'Rewards Club',
    points_per_dollar: existing?.points_per_dollar ?? 1,
    points_to_redeem: existing?.points_to_redeem ?? 100,
    minimum_points_to_redeem: existing?.minimum_points_to_redeem ?? 100,
    welcome_bonus_points: existing?.welcome_bonus_points ?? 0,
    birthday_bonus_points: existing?.birthday_bonus_points ?? 0,
    points_expiry_days: existing?.points_expiry_days ?? null,
  })

  function setF<K extends keyof WizardForm>(key: K, val: WizardForm[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // Derived: how much money does the earn/redeem rate translate to?
  const cashBackPct = form.points_to_redeem > 0
    ? ((form.points_per_dollar / form.points_to_redeem) * 100).toFixed(1)
    : '0'

  async function handleLaunch() {
    setSaving(true)
    try {
      const res = await fetch('/api/loyalty/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          is_enabled: true,
          ...form,
          points_expiry_days: expiryEnabled ? customExpiryDays : null,
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        onSaved(saved)
      }
    } finally {
      setSaving(false)
    }
  }

  const stepIcons = [Gift, Star, Percent, Zap, Rocket, CakeSlice, Clock, Check]
  const StepIcon = stepIcons[step - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
              <StepIcon size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">
                Step {step} of {TOTAL_STEPS}
              </p>
              <p className="text-sm font-bold text-gray-900">
                {step === 1 && 'Program Name'}
                {step === 2 && 'Earn Rate'}
                {step === 3 && 'Redemption Rate'}
                {step === 4 && 'Minimum to Redeem'}
                {step === 5 && 'Welcome Bonus'}
                {step === 6 && 'Birthday Bonus'}
                {step === 7 && 'Point Expiry'}
                {step === 8 && 'Review & Launch'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 transition">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-100">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">

          {/* Step 1: Program Name */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">What should we call your program?</h2>
                <p className="text-sm text-gray-500">Customers will see this name when earning and redeeming points.</p>
              </div>
              <div className="space-y-3">
                {['Rewards Club', 'VIP Points', 'Loyalty Perks', 'Points Program'].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setF('program_name', name)}
                    className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold transition border-2 text-left ${
                      form.program_name === name
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
                <div>
                  <input
                    type="text"
                    value={['Rewards Club', 'VIP Points', 'Loyalty Perks', 'Points Program'].includes(form.program_name) ? '' : form.program_name}
                    onChange={e => setF('program_name', e.target.value)}
                    onFocus={e => { if (e.target.value === '') setF('program_name', '') }}
                    placeholder="Or type a custom name…"
                    className={`w-full border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition ${
                      !['Rewards Club', 'VIP Points', 'Loyalty Perks', 'Points Program'].includes(form.program_name) && form.program_name
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-700 focus:border-brand-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Earn Rate */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">How many points per $1 spent?</h2>
                <p className="text-sm text-gray-500">More points = more exciting for customers.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 5, 10].map(pts => (
                  <PillButton
                    key={pts}
                    label={`${pts} pt${pts > 1 ? 's' : ''} / $1`}
                    selected={!customEarnActive && form.points_per_dollar === pts}
                    onClick={() => { setF('points_per_dollar', pts); setCustomEarnActive(false) }}
                  />
                ))}
                <PillButton
                  label="Custom"
                  selected={customEarnActive}
                  onClick={() => setCustomEarnActive(true)}
                />
              </div>
              {customEarnActive && (
                <CustomNumberInput
                  value={form.points_per_dollar}
                  onChange={v => setF('points_per_dollar', v)}
                  suffix="points per $1"
                />
              )}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 mt-2">
                <p className="text-sm text-brand-700 font-medium">
                  A <span className="font-extrabold">$20</span> order earns{' '}
                  <span className="font-extrabold text-brand-600">{form.points_per_dollar * 20} points</span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Redemption Rate */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">How many points equal $1 off?</h2>
                <p className="text-sm text-gray-500">Lower = more generous. Higher = more points needed to redeem.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[50, 100, 200].map(pts => (
                  <PillButton
                    key={pts}
                    label={`${pts} pts = $1`}
                    selected={!customRedeemActive && form.points_to_redeem === pts}
                    onClick={() => { setF('points_to_redeem', pts); setCustomRedeemActive(false) }}
                  />
                ))}
                <PillButton
                  label="Custom"
                  selected={customRedeemActive}
                  onClick={() => setCustomRedeemActive(true)}
                />
              </div>
              {customRedeemActive && (
                <CustomNumberInput
                  value={form.points_to_redeem}
                  onChange={v => setF('points_to_redeem', v)}
                  suffix="points = $1 off"
                />
              )}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
                <p className="text-sm text-brand-700 font-medium">
                  That's{' '}
                  <span className="font-extrabold text-brand-600">{cashBackPct}% back</span>
                  {' '}on every dollar spent
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Minimum to Redeem */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">Minimum points to redeem?</h2>
                <p className="text-sm text-gray-500">Prevents small fractional redemptions at checkout.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[50, 100, 200, 500].map(pts => (
                  <PillButton
                    key={pts}
                    label={`${pts} pts`}
                    selected={!customMinActive && form.minimum_points_to_redeem === pts}
                    onClick={() => { setF('minimum_points_to_redeem', pts); setCustomMinActive(false) }}
                  />
                ))}
                <PillButton
                  label="Custom"
                  selected={customMinActive}
                  onClick={() => setCustomMinActive(true)}
                />
              </div>
              {customMinActive && (
                <CustomNumberInput
                  value={form.minimum_points_to_redeem}
                  onChange={v => setF('minimum_points_to_redeem', v)}
                  suffix="points minimum"
                />
              )}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-gray-600 font-medium">
                  Customers need at least{' '}
                  <span className="font-extrabold">{form.minimum_points_to_redeem} points</span>
                  {' '}(worth <span className="font-extrabold">${(form.minimum_points_to_redeem / form.points_to_redeem).toFixed(2)} off</span>) to redeem
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Welcome Bonus */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">Welcome bonus for new members?</h2>
                <p className="text-sm text-gray-500">
                  Awarded on their first completed order. Great for driving sign-ups!
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <PillButton
                  label="Skip"
                  selected={!customWelcomeActive && form.welcome_bonus_points === 0}
                  onClick={() => { setF('welcome_bonus_points', 0); setCustomWelcomeActive(false) }}
                />
                {[50, 100, 200].map(pts => (
                  <PillButton
                    key={pts}
                    label={`+${pts} pts`}
                    selected={!customWelcomeActive && form.welcome_bonus_points === pts}
                    onClick={() => { setF('welcome_bonus_points', pts); setCustomWelcomeActive(false) }}
                  />
                ))}
                <PillButton
                  label="Custom"
                  selected={customWelcomeActive}
                  onClick={() => { setCustomWelcomeActive(true); if (form.welcome_bonus_points === 0) setF('welcome_bonus_points', 50) }}
                />
              </div>
              {customWelcomeActive && (
                <CustomNumberInput
                  value={form.welcome_bonus_points || null}
                  onChange={v => setF('welcome_bonus_points', v)}
                  prefix="+"
                  suffix="bonus points"
                />
              )}
              {form.welcome_bonus_points > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-green-700 font-medium">
                    New members get <span className="font-extrabold">{form.welcome_bonus_points} pts</span> free —
                    worth <span className="font-extrabold">${(form.welcome_bonus_points / form.points_to_redeem).toFixed(2)} off</span> their next visit
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Birthday Bonus */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">Birthday bonus?</h2>
                <p className="text-sm text-gray-500">
                  Awarded once per year in the customer's birth month. Builds strong loyalty.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <PillButton
                  label="Skip"
                  selected={!customBirthdayActive && form.birthday_bonus_points === 0}
                  onClick={() => { setF('birthday_bonus_points', 0); setCustomBirthdayActive(false) }}
                />
                {[100, 200, 500].map(pts => (
                  <PillButton
                    key={pts}
                    label={`+${pts} pts`}
                    selected={!customBirthdayActive && form.birthday_bonus_points === pts}
                    onClick={() => { setF('birthday_bonus_points', pts); setCustomBirthdayActive(false) }}
                  />
                ))}
                <PillButton
                  label="Custom"
                  selected={customBirthdayActive}
                  onClick={() => { setCustomBirthdayActive(true); if (form.birthday_bonus_points === 0) setF('birthday_bonus_points', 100) }}
                />
              </div>
              {customBirthdayActive && (
                <CustomNumberInput
                  value={form.birthday_bonus_points || null}
                  onChange={v => setF('birthday_bonus_points', v)}
                  prefix="+"
                  suffix="birthday points"
                />
              )}
              {form.birthday_bonus_points > 0 && (
                <div className="bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-pink-700 font-medium">
                    🎂 Customers get <span className="font-extrabold">{form.birthday_bonus_points} pts</span> in their birth month —
                    worth <span className="font-extrabold">${(form.birthday_bonus_points / form.points_to_redeem).toFixed(2)} off</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Expiry */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">Do points expire?</h2>
                <p className="text-sm text-gray-500">
                  Expiry encourages visits. Set based on how often your customers return.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setExpiryEnabled(false)}
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold transition border-2 text-left flex items-start gap-3 ${
                    !expiryEnabled ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl leading-none mt-0.5">♾️</span>
                  <div>
                    <p className="font-bold">Never expire</p>
                    <p className="text-xs font-normal text-gray-500 mt-0.5">Points stay forever — best for loyal regulars</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryEnabled(true)}
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold transition border-2 text-left flex items-start gap-3 ${
                    expiryEnabled ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl leading-none mt-0.5">⏰</span>
                  <div>
                    <p className="font-bold">Expire after inactivity</p>
                    <p className="text-xs font-normal text-gray-500 mt-0.5">Points reset if no activity for N days</p>
                  </div>
                </button>
              </div>
              {expiryEnabled && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-medium text-gray-600">Expire after</span>
                  <input
                    type="number"
                    min={30}
                    max={730}
                    value={customExpiryDays}
                    onChange={e => setCustomExpiryDays(Math.max(30, parseInt(e.target.value) || 365))}
                    className="w-24 border-2 border-brand-300 rounded-xl px-3 py-2 text-sm font-bold text-brand-700 focus:outline-none focus:border-brand-500 text-center"
                  />
                  <span className="text-sm font-medium text-gray-600">days of inactivity</span>
                </div>
              )}
            </div>
          )}

          {/* Step 8: Review */}
          {step === 8 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">Ready to launch?</h2>
                <p className="text-sm text-gray-500">Review your settings below. You can change anything later.</p>
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-100">
                  <Gift size={16} className="text-brand-500 shrink-0" />
                  <p className="font-extrabold text-brand-700 text-base">{form.program_name}</p>
                </div>
                {[
                  { label: 'Earn rate', value: `${form.points_per_dollar} pt${form.points_per_dollar > 1 ? 's' : ''} per $1 spent` },
                  { label: 'Redeem rate', value: `${form.points_to_redeem} points = $1 off` },
                  { label: 'Min. to redeem', value: `${form.minimum_points_to_redeem} points (${(form.minimum_points_to_redeem / form.points_to_redeem).toFixed(2)}$ off)` },
                  { label: 'Cash-back rate', value: `${cashBackPct}% back` },
                  { label: 'Welcome bonus', value: form.welcome_bonus_points > 0 ? `+${form.welcome_bonus_points} pts on first order` : 'None' },
                  { label: 'Birthday bonus', value: form.birthday_bonus_points > 0 ? `+${form.birthday_bonus_points} pts per year` : 'None' },
                  { label: 'Points expiry', value: expiryEnabled ? `After ${customExpiryDays} days inactive` : 'Never expire' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !form.program_name.trim()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition disabled:opacity-50 shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition disabled:opacity-60 shadow-sm"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Rocket size={16} />}
              {saving ? 'Launching…' : 'Launch Program!'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
