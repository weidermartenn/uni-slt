<template>
  <div class="grid grid-cols-[1fr_3fr] w-full h-[calc(100vh-100px)]">
    <div class="border-r-2 px-6 py-4 v-col">
      <UCard v-for="i in 4" :key="i" class="border border-gray-200 animate-pulse">
        <div class="flex items-center gap-4">
          
        </div>
      </UCard>
    </div>

    <div>
      <bid />
    </div>
  </div>
</template>

<script setup lang="ts">

</script>
