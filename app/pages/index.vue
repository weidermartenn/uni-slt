<template>
    <UApp>
        <div class="w-full h-[90vh] flex flex-col items-center justify-center">
            <UCard :ui="{ 'body': 'text-black bg-zinc-100' }">
                <div class="v-col items-center justify-center gap-2">
                    <div class="v-row">
                        <UIcon name="i-lucide-wrench" class="w-10 h-10 animate-pulse" />
                        <UIcon name="i-lucide-hammer" class="w-10 h-10 animate-pulse -scale-x-100"/>
                    </div>
                    <span class="text-md font-medium animate-pulse">Данная страница находится в разработке</span>
                </div>
            </UCard>
        </div>
    </UApp>
</template>

<script setup lang="ts">
useHead({ title: 'СЛТ Личный кабинет' });
definePageMeta({
    layout: 'default',
})
</script>

<style scoped>

</style>