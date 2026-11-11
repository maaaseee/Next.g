import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CatalogGameCard from '@/components/common/CatalogGameCard.vue'
import type { Game } from '@/types/game'

describe('Shared Catalog Components', () => {
  describe('SearchInput', () => {
    it('emits update:modelValue on text input', async () => {
      const wrapper = mount(SearchInput, {
        props: {
          modelValue: '',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('Zelda')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['Zelda'])
    })

    it('emits clear and empties query when clear button is clicked', async () => {
      const wrapper = mount(SearchInput, {
        props: {
          modelValue: 'Elden Ring',
        },
      })

      const clearBtn = wrapper.find('button[aria-label="Borrar búsqueda"]')
      expect(clearBtn.exists()).toBe(true)
      await clearBtn.trigger('click')

      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
    })
  })

  describe('EmptyState', () => {
    it('renders title, description and triggers action emit', async () => {
      const wrapper = mount(EmptyState, {
        props: {
          title: 'Sin resultados',
          description: 'Intenta con otro término.',
          actionLabel: 'Restablecer',
        },
      })

      expect(wrapper.text()).toContain('Sin resultados')
      expect(wrapper.text()).toContain('Intenta con otro término.')

      const button = wrapper.find('button')
      await button.trigger('click')
      expect(wrapper.emitted('action')).toBeTruthy()
    })
  })

  describe('CatalogGameCard', () => {
    const mockGame: Game = {
      id: 101,
      title: 'Chrono Trigger',
      cover_url: 'https://example.com/cover.jpg',
      release_year: 1995,
      summary: 'Classic JRPG',
      genres: ['RPG', 'Aventura'],
      platforms: ['SNES'],
      rating: 95,
      game_modes: ['Single player'],
    }

    it('renders game title, year and formatted rating', () => {
      const wrapper = mount(CatalogGameCard, {
        props: {
          game: mockGame,
          rankingIndex: 0,
        },
      })

      expect(wrapper.text()).toContain('Chrono Trigger')
      expect(wrapper.text()).toContain('#1')
      expect(wrapper.text()).toContain('RPG, Aventura')
    })
  })
})
