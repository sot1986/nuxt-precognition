<script setup lang="ts">
import { z } from 'zod'
import { useForm } from '#imports'

defineOptions({
  name: 'Laravel',
  inheritAttrs: false,
})

const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  friends: z.array(z.string()),
})
type Post = z.infer<typeof postSchema>

const selectedPost = ref<Post | null>(null)

const { $api } = useNuxtApp()

const postForm = useForm(
  () => selectedPost.value
    ? { ...selectedPost.value }
    : { title: '', content: '', friends: [] },
  (data, headers) => $api(
    '/api/posts' + (selectedPost.value ? `/${selectedPost.value.id}` : ''), {
      method: selectedPost.value ? 'PUT' : 'POST',
      headers,
      body: data,
    }),
)
</script>

<template>
  <div class="">
    <h1 class="text-xl font-semibold mx-auto py-4">
      Laravel
    </h1>

    <form
      class="flex flex-col gap-10 max-w-4xl mx-auto p-4"
      @submit.prevent="postForm.submit"
    >
      <label class="flex flex-col gap-2 relative">
        Title
        <input
          v-model="postForm.title"
          placeholder="Title"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          @change="postForm.validate('title')"
        >
        <div
          v-if="postForm.valid('title')"
          class="absolute p-1 inset-y-0 right-0 translate-x-full"
        >OK</div>
        <p v-if="postForm.invalid('title')">{{ postForm.errors.title }}</p>
      </label>

      <label class="flex flex-col gap-2 relative">
        Content
        <textarea
          v-model="postForm.content"
          placeholder="Content"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          @change="postForm.validate('content')"
        />
        <div
          v-if="postForm.valid('content')"
          class="absolute p-1 inset-y-0 right-0 translate-x-full"
        >OK</div>
        <p v-if="postForm.invalid('content')">{{ postForm.errors.content }}</p>
      </label>

      <button
        class="bg-indigo-600 text-white px-4 py-2 rounded-md mx-auto hover:bg-indigo-500"
      >
        Submit
      </button>
    </form>
  </div>
</template>
