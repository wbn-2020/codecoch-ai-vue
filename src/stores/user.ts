import { defineStore } from 'pinia'

import { getUserProfileApi, updateUserProfileApi } from '@/api/user'
import type { UserProfileUpdateDTO, UserProfileVO } from '@/types/user'

interface UserState {
  profile: UserProfileVO | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    profile: null
  }),

  actions: {
    async fetchProfile() {
      this.profile = await getUserProfileApi()
      return this.profile
    },

    async updateProfile(data: UserProfileUpdateDTO) {
      this.profile = await updateUserProfileApi(data)
      return this.profile
    },

    clearProfile() {
      this.profile = null
    }
  }
})
