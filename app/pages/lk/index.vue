<template>
  <div class="max-w-4xl mx-auto">
      <UTabs 
        :items="items" 
        v-if="user?.roleCode === 'ROLE_ADMIN'"
        :unmount-on-hide="false"
      >
            <template #lk>
              <UserLK />
            </template>
            <template #employees>
              <AETab />
            </template>
      </UTabs>
      <UserLK v-else />
  </div>
</template>

<script setup lang="ts">
import { getUser } from '~/helpers/getUser'

useHead({ title: 'СЛТ Личный кабинет' })
definePageMeta({ layout: 'default' })

const items = [
    {
        label: 'Личный кабинет',
        icon: 'i-lucide-user',
        slot: 'lk',
    },
    {
        label: 'Все сотрудники',
        icon: 'i-lucide-users',
        slot: 'employees',
    }
]

const user = getUser()
</script>

<style scoped>
</style>