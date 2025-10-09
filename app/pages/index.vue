<template>
  <div class="max-w-4xl mx-auto">
      <UTabs :items="items">
            <template #lk>
              <UserLK />
            </template>
            <template #employees>
      
            </template>
      </UTabs>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'СЛТ Личный кабинет' })
definePageMeta({ layout: 'default' })

const items = [
    {
        label: 'Личный кабинет',
        icon: 'i-lucide-user',
        slot: 'lk'
    },
    {
        label: 'Все сотрудники',
        icon: 'i-lucide-users',
        slot: 'employees'
    }
]
</script>

<style scoped>
</style>