<style lang="scss">
</style>

<template lang="pug">
    view {{value}}
    image(src="@image/usr.svg")
</template>

<script lang="ts">
import { wrapper } from '@zouke/wapp-lib/make';
export default wrapper({
    data: {
        value: 3
    },
    methods: {
        setValue(){
            this.value = 4;
        }
    }
})
</script>