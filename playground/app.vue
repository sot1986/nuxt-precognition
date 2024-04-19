<script setup lang="ts">

</script>

<template>
  <div class="container mx-auto min-h-screen p-2">
    <div class="flex w-full h-full">
      <nav>
        <h2 class="text-lg font-bold">
          Pages
        </h2>
        <ul class="mt-4 w-40">
          <li class="w-full hover:bg-gray-100">
            <NuxtLink
              to="/"
              class="px-2 py-1"
            >
              Home
            </NuxtLink>
          </li>
          <li class="w-full hover:bg-gray-100">
            <NuxtLink
              to="/login"
              class="px-2 py-1"
            >
              Login
            </NuxtLink>
          </li>
          <li class="w-full hover:bg-gray-100">
            <NuxtLink
              to="/laravel"
              class="px-2 py-1 "
            >
              Laravel
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <main class="flex-1 h-full">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>
