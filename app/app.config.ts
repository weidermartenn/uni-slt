export default defineAppConfig({
    ui: {
        colors: {
            primary: 'sky'
        },
        button: {
            slots: {
                base: 'cursor-pointer'
            }
        },
        popover: {
            slots: {
                content: 'bg-white text-zinc-900 border-none shadow-xs',
                arrow: 'fill-default'
            }
        },
        switch: {
            slots: {
                base: [
                'data-[state=checked]:bg-zinc-200',
                'data-[state=unchecked]:bg-zinc-900',
                'cursor-pointer'
                ],
                thumb: [
                'data-[state=checked]:bg-zinc-900',
                'data-[state=unchecked]:bg-zinc-100'
                ],
                track: [
                'data-[state=checked]:bg-zinc-900',
                'data-[state=unchecked]:bg-zinc-200'
                ]
            }
        },
        slideover: {
            slots: {
                overlay: 'border-none',
                content: 'bg-[#2d2d2d] border-none',
                title: 'text-white text-highlighted font-semibold',
                body: 'flex-1 overflow-y-scroll p-4 sm:p-6',
                close: 'absolute top-4 end-4 hover:bg-zinc-800 rounded-md p-1'
            },
            variants: {
                left: {
                    content: 'left-0 inset-y-0 w-full max-w-md'
                }
            }
        },
    }
})