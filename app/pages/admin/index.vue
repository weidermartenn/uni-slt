<template>
    <UApp>
        <div class="w-full h-[90vh] p-10 v-col">
            <div class="v-row justify-between">
                <UInput
                    :model-value="table?.tableApi?.getColumn('fullName')?.getFilterValue() as string"
                    class="max-w-lg"
                    placeholder="Поиск..."
                    @update:model-value="table?.tableApi?.getColumn('fullName')?.setFilterValue($event)"
                />
                <UButton color="secondary" variant="soft" icon="i-lucide-user-plus" label="Добавить сотрудника"/>
            </div>
            <UTable ref="table" sticky="header" :data="data" :columns="columns" class="flex-1 overflow-scroll"/>
            <button @click="log">sdfsdf</button>
        </div>
        <UModal
            v-model:open="isDeleteModalOpen"
            title="Подтверждение удаления"
            :description="selectedEmployee ? `Удалить сотрудника ${selectedEmployee.fullName || '#' + selectedEmployee.id}?` : ''"
        >
            <template #body>
                <div class="text-sm text-gray-600">
                Это действие нельзя будет отменить.
                </div>
            </template>

            <template #footer>
                <div class="flex justify-end gap-3">
                <UButton color="info" variant="ghost" label="Отмена" @click="isDeleteModalOpen = false" />
                <UButton color="error" label="Удалить" @click="confirmDelete" />
                </div>
            </template>
        </UModal>
    </UApp>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { User } from '~/entities/User/types';
import { useEmployeeStore } from '~/stores/employee-store';
import type { Row } from '@tanstack/vue-table'
useHead({ title: 'СЛТ Личный кабинет' });
definePageMeta({
    layout: 'default',
})

const isDeleteModalOpen = ref(false);
const selectedEmployee = ref<User | null>(null)

const aeiStore = useEmployeeStore();
const log = async () => {
    await aeiStore.fetchAllEmployeeInfos();
    console.log(aeiStore.employeesAllInfo)
}

const data = computed(() => 
    aeiStore.employeesAllInfo.filter((emp) => emp.fullName !== null)
)

const table = useTemplateRef('table')

const UBadge = resolveComponent('UBadge')
const ULink = resolveComponent('ULink')
const UCard = resolveComponent('UCard')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')
const UModal = resolveComponent('UModal')

const openDeleteModal = (employee: User) => {
    selectedEmployee.value = employee
    isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
    if (selectedEmployee.value) {
        try {
            await aeiStore.deleteEmployee(selectedEmployee.value.id)
        } catch (e) {
            console.log(e)
        } finally {
            isDeleteModalOpen.value = false
            selectedEmployee.value = null
        }
    }
}

const columns: TableColumn<User>[] = [
    { 
        accessorKey: 'id',
        header: '#',
        cell: ({ row }) => `#${row.getValue('id')}`,
    },
    {
        accessorKey: 'fullName',
        header: 'ФИО',
        cell: ({ row }) => row.getValue('fullName'),
    }, 
    {
        accessorKey: 'employee.department',
        header: 'Отдел',
        cell: ({ row }) => {
            const employee = row.original.employee
            if (employee) {
                const dep = employee.department
                if (dep !== null) return dep
                else return 'Не указан'
            }
            return 'Не указан'
        }
    },
    {
        accessorKey: 'confirmed',
        header: 'Подтвержден',
        cell: ({ row }) => {
            const color = {
                true: 'success' as const,
                false: 'error' as const
            }[row.getValue('confirmed') as string]

            const text = row.getValue('confirmed') as boolean ? 'Да' : 'Нет'

            return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => text)
        }
    },
    {
        accessorKey: 'login',
        header: 'Telegram',
        cell: ({ row }) => {
            const link = row.getValue('login') as string
            if (link !== null && link !== 'Из ТУ') {
                return h(ULink, { class: 'text-zinc-800 bg-zinc-100 rounded-sm p-1 font-semibold hover:bg-zinc-900 hover:text-zinc-100', to: `https://t.me/${link}`, target: '_blank' }, () => `@${link}`)
            } else if (link === 'Из ТУ') return 'Из ТУ'
            else return 'Не указан'
        }
    },
    {
        accessorKey: 'phone',
        header: 'Номер телефона',
        cell: ({ row }) => row.getValue('phone')
    },
    {
        accessorKey: 'salary',
        header: 'Зарплата',
        cell: ({ row }) => {
            const employee = row.original.employee
            if (employee) {
                return h(UCard, { class: 'p-1 min-w-[200px]' }, () => 
                    h('div', { class: 'space-y-2' }, [
                        h('div', 'Надбавки к ставке'),
                        h('div', { class: 'flex justify-start items-center gap-1' }, [
                            h('span', { class: 'font-semibold text-emerald-800 bg-zinc-100 p-1 rounded-md' }, `${employee.coefficientClientLead}%`),
                            h('span', { class: 'font-semibold text-emerald-800 bg-zinc-100 p-1 rounded-md' }, `${employee.coefficientDepartmentHead}%`),
                            h('span', { class: 'font-semibold text-emerald-800 bg-zinc-100 p-1 rounded-md' }, `${employee.coefficientManager}%`),
                            h('span', { class: 'font-semibold text-emerald-800 bg-zinc-100 p-1 rounded-md' }, `${employee.coefficientSalesManager}%`)
                        ]),
                        h('div', { class: 'flex justify-between items-center' }, [
                            h('span', { class: 'text-sm text-gray-600' }, 'Ставка:'),
                            h('span', { class: 'font-semibold text-green-600' }, `${employee.salary} руб.`)
                        ]),
                        h('div', { class: 'flex justify-between items-center' }, [
                            h('span', { class: 'text-sm text-gray-600' }, 'Другие выплаты:'),
                            h('span', { class: 'font-semibold text-blue-600' }, `${employee.otherPayments} руб.`)
                        ]),
                        h('div', { class: 'border-t pt-2 flex justify-between items-center font-medium' }, [
                            h('span', { class: 'text-sm' }, 'Итого:'),
                            h('span', { class: 'text-lg font-bold' }, `${employee.salary + employee.otherPayments} руб.`)
                        ])
                    ])
                )
            }
            return 'Не указано'
        }
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            return h(
                'div',
                { class: 'text-right' },
                h(
                    UDropdownMenu,
                    {
                        content: {
                            align: 'end',
                        },
                        items: getRowItems(row),
                        'aria-label': 'Действия'
                    },
                    () => 
                    h(UButton, {
                        icon: 'i-lucide-ellipsis-vertical',
                        color: 'neutral',
                        variant: 'ghost',
                        class: 'ml-auto',
                        'aria-label': 'Действия'
                    })
                )
            )
        }
    }
]

function getRowItems(row: Row<User>) {
    return [
        {
            type: 'label',
            label: 'Действия'
        },
        { 
            type: 'separator'
        },
        {
            label: 'Редактировать',
            onSelect() {}
        },
        {
            label: 'Удалить',
            onSelect: () => openDeleteModal(row.original)
        }
    ]
}

onMounted(async () => {
    await aeiStore.fetchAllEmployeeInfos();
})
</script>

<style scoped>

</style>