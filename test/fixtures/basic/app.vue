<script setup lang="ts">
import type { User } from './schemas/user'
import { onMounted, useForm } from '#imports'

type NewUser = Pick<User, 'name' | 'email'>

const newUser: NewUser = {
  name: '',
  email: '',
}

const form = useForm(
  newUser,
  (data, headers) => $fetch(
    '/api/users',
    { method: 'POST', body: data, headers },
  ),
  {
    onBeforeValidation(data) {
      console.log('onBeforeValidation', data)
      return true
    },
  },
)

onMounted(() => {
  console.log('onMounted')
})
</script>

<template>
  <div>
    <h1>Test update user profile</h1>
    <form
      @reset.prevent="form.reset()"
      @submit.prevent="form.submit()"
    >
      <fieldset>
        <legend>update user data</legend>
        <div>
          <label>Name
            <input
              id="name"
              v-model="form.name"
              name="name"
              type="text"
              aria-describedby="name-error"
              @change="form.validate('name')"
            >
          </label>
          <p id="name-error">
            {{ form.invalid('name') ? form.errors.name : 'Type your name' }}
          </p>
        </div>
        <div>
          <label>Email
            <input
              id="email"
              v-model="form.email"
              name="email"
              type="email"
              aria-describedby="email-error"
              @change="form.validate('email')"
            >
          </label>
          <p id="email-error">
            {{ form.invalid('email') ? form.errors.email : 'Type your email' }}
          </p>
        </div>
      </fieldset>
      <div>
        <button
          id="reset"
          type="reset"
        >
          reset
        </button>
        <button
          id="submit"
          type="submit"
        >
          submit
        </button>
      </div>
    </form>
  </div>
</template>
