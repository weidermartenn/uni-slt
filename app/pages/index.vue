<template>
  <div class="flex v-col items-center h-[calc(100vh-100px)] text-white">
    <video
    autoplay 
    muted 
    loop 
    playsinline 
    class="absolute top-0 left-0 w-full h-full object-cover -z-10"
    >
      <source src="assets/truck1.mp4">
    </video>
    <div class="bg-zinc-800/50 w-full h-full v-col p-4 z-10">
      <div class="v-row justify-center items-center">
        <img src="assets/logo.png" class="h-32">
        <div>
          <h1 class="py-4 text-7xl border-b-5">СИСТЕМ ЛОДЖИСТИКС</h1>
        </div>
      </div>
      <div class="v-col items-center">
        <h2 class="text-3xl font-extralight">Приветствуем Вас в системе логистической компании</h2>
        <UButton class="bg-white text-black border-none hover:bg-gray-200">
          <NuxtLink to="/lk#lk">Перейти в личный кабинет</NuxtLink>
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<style scoped>

</style>