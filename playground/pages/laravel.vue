<script setup lang="ts">
import { z } from 'zod'
import { useForm } from '#imports'

defineOptions({
  name: 'Laravel',
  inheritAttrs: false,
})

/**
 * Post schema. Defined using Zod.
 * Add specific file validations because it is
 * sent during precognitive validation request. *
 */
const postSchema = z.object({
  title: z.string().min(5).max(100),
  content: z.string().min(10).max(1000),
  friends: z.array(z.string()),
  image: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, {
      message: 'File size must be less than 10MB',
    })
    .refine(file => ['image/jpeg', 'image/png', 'image/gif'].includes(file.type), {
      message: 'File must be JPEG, PNG, or GIF',
    })
    .refine(file => file.name.length > 0, {
      message: 'File must have a name',
    })
    .refine(file => !!file.name.match(/^[a-z0-9]+\.[a-z0-9]+$/i), {
      message: 'File name must be alphanumeric with an extension. No spaces or special characters.',
    })
    .nullable(),
})
type Post = z.infer<typeof postSchema>

/**
 * Use the global $api to make backend request (to Laravel for example) defined in Nuxt Plugin.
 * It includes already Zod parser for validation errors.
 */
const { $api } = useNuxtApp()

/**
 * Define the form using useForm composable.
 * The second argument is a function to submit the form data to the backend. Being complete agnostic,
 * the headers to submit form data must be specified. Precognnitive header are already present.
 * Here we use FormData to handle file upload.
 * Client-side validation is specified in the UseFormOptions.
 */
const postForm = useForm(
  (): Post => ({ title: '', content: '', friends: [], image: null }),
  (data, headers) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('content', data.content)
    data.friends.forEach((friend, index) => {
      formData.append(`friends[${index}]`, friend)
    })
    if (data.image) {
      formData.append('image', data.image)
    }
    headers.set('Content-Type', 'multipart/form-data')
    return $api(
      '/api/posts', {
        method: 'POST',
        headers,
        body: formData,
      })
  },
  {
    clientValidation: postSchema.parse,
    validateFiles: false, // Set to true if needed
  },
)

function addImage(e: Event) {
  postForm.image = null
  postForm.forgetErrors('image')
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    postForm.image = input.files[0]
    postForm.validate('image')
  }
}

function handleSubmit() {
  postForm.submit({
    onBefore() {
      postForm.forgetErrors()
      return true
    },
    onStart: (data) => {
      postSchema.parse(data)
    },
  })
}
</script>

<template>
  <div class="">
    <h1 class="text-xl font-semibold mx-auto py-4">
      Laravel
    </h1>

    <form
      class="flex flex-col gap-10 max-w-4xl mx-auto p-4"
      @submit.prevent="handleSubmit"
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

      <label for="image">Image</label>

      <input
        id="image"
        type="file"
        @change="addImage"
      >
      <div v-if="postForm.valid('image')">
        OK
      </div>
      <p v-if="postForm.invalid('image')">
        {{ postForm.errors.image }}
      </p>

      <button
        class="bg-indigo-600 text-white px-4 py-2 rounded-md mx-auto hover:bg-indigo-500"
      >
        Submit
      </button>
    </form>
  </div>
</template>
