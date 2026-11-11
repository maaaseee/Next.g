import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OptionCard from '@/components/common/OptionCard.vue'

describe('OptionCard', () => {
  it('renders title, subtitle, description and badge', () => {
    const wrapper = mount(OptionCard, {
      props: {
        title: 'Drag & Drop Cinético',
        subtitle: 'Arrastre fluido con puntero',
        description: 'Mueve juegos entre columnas arrastrándolos con el cursor.',
        badge: 'Recomendado',
      },
    })

    expect(wrapper.text()).toContain('Drag & Drop Cinético')
    expect(wrapper.text()).toContain('Arrastre fluido con puntero')
    expect(wrapper.text()).toContain('Mueve juegos entre columnas')
    expect(wrapper.text()).toContain('Recomendado')
  })

  it('handles selected state correctly via prop', () => {
    const wrapper = mount(OptionCard, {
      props: {
        selected: true,
        title: 'Option A',
      },
    })

    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('emits events on click with v-model semantics', async () => {
    const wrapper = mount(OptionCard, {
      props: {
        modelValue: false,
        value: true,
        title: 'Enable DnD',
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([true])
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('does not emit events when disabled', async () => {
    const wrapper = mount(OptionCard, {
      props: {
        disabled: true,
        title: 'Disabled Option',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('supports keyboard navigation via Enter key', async () => {
    const wrapper = mount(OptionCard, {
      props: {
        value: 'slot-mode',
        modelValue: 'classic-mode',
        title: 'Slot Mode',
      },
    })

    await wrapper.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['slot-mode'])
  })
})
