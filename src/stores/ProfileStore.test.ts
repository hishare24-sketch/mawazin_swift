import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { PROOF_META, skillConfidence, useProfileStore } from './ProfileStore'
import type { Skill } from './ProfileStore'

function skill(proofs: Skill['proofs']): Skill {
  return { id: 1, name: 'Test', selfLevel: 3, proofs }
}

describe('skillConfidence', () => {
  it('sums proof weights and caps at 100', () => {
    const s = skill([
      { id: 1, type: 'assessment', label: '', date: '' }, // 35
      { id: 2, type: 'endorsement', label: '', date: '' }, // 25
    ])
    expect(skillConfidence(s)).toBe(PROOF_META.assessment.weight + PROOF_META.endorsement.weight)
  })

  it('never exceeds 100 even with many proofs', () => {
    const s = skill(Array.from({ length: 6 }, (_, i) => ({ id: i, type: 'assessment' as const, label: '', date: '' })))
    expect(skillConfidence(s)).toBe(100)
  })

  it('is 0 for a skill with no proofs', () => {
    expect(skillConfidence(skill([]))).toBe(0)
  })
})

describe('ProfileStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('adds a skill with a self proof', () => {
    const store = useProfileStore()
    const before = store.skills.length
    store.addSkill('GraphQL', 4)
    expect(store.skills.length).toBe(before + 1)
    const added = store.skills.at(-1)!
    expect(added.name).toBe('GraphQL')
    expect(added.proofs.some(p => p.type === 'self')).toBe(true)
  })

  it('flags skills with only self-assessment as unverified', () => {
    const store = useProfileStore()
    store.addSkill('OnlySelf', 2)
    expect(store.unverifiedSkills).toContain('OnlySelf')
  })

  it('resolving a proof request as accepted adds an endorsement proof', () => {
    const store = useProfileStore()
    const req = store.pendingProofRequests[0]
    const before = store.pendingProofRequests.length
    store.resolveProofRequest(req.id, true)
    expect(store.pendingProofRequests.length).toBe(before - 1)
  })
})
