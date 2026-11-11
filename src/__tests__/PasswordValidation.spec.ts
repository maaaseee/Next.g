import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'

describe('PasswordRequirements component', () => {
  it('recognizes "ñ" as a valid letter and checks requirements correctly', () => {
    const wrapper = mount(PasswordRequirements, {
      props: {
        password: 'contraseña',
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Mínimo 8 caracteres')
    expect(text).toContain('Al menos una letra')
    expect(text).toContain('Al menos una letra mayúscula')
    expect(text).toContain('Al menos un número')

    // 'contraseña' has 10 chars (>= 8) and contains letters including 'ñ', but no uppercase or number
    const listItems = wrapper.findAll('li')
    expect(listItems[0]?.classes()).toContain('text-emerald-400') // length >= 8
    expect(listItems[1]?.classes()).toContain('text-emerald-400') // hasLetter ('ñ')
    expect(listItems[2]?.classes()).toContain('opacity-50') // no uppercase
    expect(listItems[3]?.classes()).toContain('opacity-50') // no number
  })

  it('recognizes "Ñ" as an uppercase letter and validates all 4 rules when complete', () => {
    const wrapper = mount(PasswordRequirements, {
      props: {
        password: 'Contraseña99!',
      },
    })

    const listItems = wrapper.findAll('li')
    expect(listItems[0]?.classes()).toContain('text-emerald-400') // length 13 >= 8
    expect(listItems[1]?.classes()).toContain('text-emerald-400') // letter
    expect(listItems[2]?.classes()).toContain('text-emerald-400') // uppercase 'C'
    expect(listItems[3]?.classes()).toContain('text-emerald-400') // number '9'
  })

  it('rejects passwords shorter than 8 characters', () => {
    const wrapper = mount(PasswordRequirements, {
      props: {
        password: 'Niño1!',
      },
    })

    const listItems = wrapper.findAll('li')
    expect(listItems[0]?.classes()).toContain('opacity-50') // only 6 chars, fails min 8
    expect(listItems[1]?.classes()).toContain('text-emerald-400') // letter 'i', 'ñ', 'o'
    expect(listItems[2]?.classes()).toContain('text-emerald-400') // uppercase 'N'
    expect(listItems[3]?.classes()).toContain('text-emerald-400') // number '1'
  })
})
