<template>
  <div class="font-sans leading-relaxed text-gray-800 max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0">
    <!-- Заголовок документа -->
    <div class="text-center mb-8 pb-4 border-b-2 border-blue-500">
      <h1 class="text-18pt font-bold text-gray-800 mb-2">
        ДОГОВОР-ЗАЯВКА НА ЗАКАЗ ТРАНСПОРТНОГО СРЕДСТВА
      </h1>
      <div class="flex justify-between font-bold">
        <span>№ {{ contractData.contractNumber }}</span>
        <span>Дата: {{ contractData.contractDate }}</span>
      </div>
    </div>

    <!-- Информация о заказчике -->
    <SectionTitle title="ПЛАТЕЛЬЩИК (ЗАКАЗЧИК)" />
    <div class="mb-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="p-2 border-b border-gray-200">
          <strong>Наименование:</strong> {{ contractData.clientName }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Телефон:</strong> {{ contractData.clientPhone }}
        </div>
        <div class="col-span-2 p-2 border-b border-gray-200">
          <strong>Юридический адрес:</strong> {{ contractData.clientAddress }}
        </div>
      </div>
    </div>

    <!-- Детали перевозки -->
    <SectionTitle title="ДЕТАЛИ ПЕРЕВОЗКИ" />
    <div class="mb-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="p-2 border-b border-gray-200">
          <strong>Маршрут:</strong> {{ contractData.route }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Вид ТС:</strong> {{ contractData.vehicleType }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Характер груза:</strong> {{ contractData.cargoType }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Вес груза:</strong> {{ contractData.cargoWeight }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Тип контейнера:</strong> {{ contractData.containerType }}
        </div>
        <div class="p-2 border-b border-gray-200">
          <strong>Дата загрузки:</strong> {{ contractData.loadingDate }}
        </div>
        <div class="col-span-2 p-2 border-b border-gray-200">
          <strong>Ставка за перевозку:</strong> {{ contractData.transportRate }}
        </div>
      </div>
    </div>

    <!-- Условия оплаты -->
    <SectionTitle title="УСЛОВИЯ ОПЛАТЫ" />
    <div class="mb-4">
      <div class="p-2 border-b border-gray-200">
        <strong>Вид оплаты:</strong> С НДС
      </div>
      <div class="p-2 border-b border-gray-200">
        <strong>Срок оплаты:</strong> {{ contractData.paymentTerms }}
      </div>
    </div>

    <!-- Условия перевозки -->
    <SectionTitle title="УСЛОВИЯ ПЕРЕВОЗКИ" />
    <div class="mb-4">
      <ul class="list-disc pl-5 space-y-2">
        <li>Нормативное время на загрузку/выгрузку ТС: 4 часа</li>
        <li>Оплата простоя за сверхнормативное время: 3000 руб/час</li>
        <li>Отказ от ТС менее чем за 24 часа по вине Заказчика: 20% от стоимости перевозки (не более 20000 руб.)</li>
        <li>Срыв загрузки по вине Перевозчика: 20% от стоимости перевозки (не более 20000 руб.)</li>
        <li>Отправитель обязан предоставить верно оформленные оригинальные документы на рейс</li>
        <li>Данная заявка подтверждает факт заключения договора на перевозку груза</li>
      </ul>
    </div>

    <!-- Информация о водителях и ТС -->
    <SectionTitle title="ИНФОРМАЦИЯ О ВОДИТЕЛЯХ И ТРАНСПОРТЕ" />
    <div class="italic text-gray-600 p-3 bg-gray-50 rounded mb-4">
      Заполняется перевозчиком: Ф.И.О. водителей, паспортные данные, данные на ТС, номера контейнеров
    </div>

    <!-- Реквизиты и подписи -->
    <div class="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-400">
      <div>
        <h3 class="text-12pt font-bold text-gray-800 mb-3">ПЕРЕВОЗЧИК</h3>
        <div class="text-10pt leading-tight min-h-[200px]">
          <strong>ООО «Систем Лоджистикс»</strong><br>
          Юридический адрес: 198152, Санкт-Петербург г, Краснопутиловская ул, дом 15, литер А, помещение 16-Н, комната 2<br>
          Адрес доставки документов: 198323, Санкт-Петербург, Волхонское шоссе д.6, оф. 32<br>
          ОГРН: 1177847365013<br>
          ИНН: 7805717259<br>
          КПП: 780501001<br>
          БИК: 044525360<br>
          Р/С № 40702810312010159452 в Филиал «Корпоративный» ПАО «СОВКОМБАНК»<br>
          К/С № 30101810445250000360<br>
          Тел.: +7 (812) 309-17-66<br>
          e-mail: info@slt-spb.ru<br>
          <br>
          Генеральный директор<br>
          __________________________ / Крутских И.В.
        </div>
      </div>

      <div>
        <h3 class="text-12pt font-bold text-gray-800 mb-3">ЗАКАЗЧИК</h3>
        <div class="text-10pt leading-tight min-h-[200px]">
          Данные заполняются из карточки клиента в СБИС<br>
          <br>
          __________________________<br>
          М.П.<br>
          __________________________ / {{ contractData.clientName }}
        </div>
      </div>
    </div>

    <!-- Примечания -->
    <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-10pt">
      <strong>Примечания:</strong>
      <ul class="list-disc pl-5 mt-2 space-y-1">
        <li>При отсутствии генерального договора, данный договор-заявка имеет силу генерального договора на разовую перевозку</li>
        <li>Действительна копия с факсимильными печатями</li>
        <li>Заказчик несет ответственность за точность предоставленной информации о грузе</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import SectionTitle from './SectionTitle.vue'

const props = defineProps({
  contractData: {
    type: Object,
    required: true,
    default: () => ({
      contractNumber: 'СЛТ-2024-001',
      contractDate: '15.01.2024',
      clientName: 'ООО "Ваша Компания"',
      clientAddress: 'г. Москва, ул. Примерная, д. 1',
      clientPhone: '+7 (999) 123-45-67',
      route: 'Москва - Санкт-Петербург',
      vehicleType: 'Тент',
      cargoType: 'Промышленное оборудование',
      cargoWeight: '5000 кг',
      containerType: '20 футов',
      loadingDate: '20.01.2024',
      transportRate: '50 000 руб.',
      paymentTerms: 'Предоплата 20%. 80% до выгрузки.'
    })
  }
})
</script>