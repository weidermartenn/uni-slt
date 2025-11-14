<template>
  <div class="transport-application">
    <div class="document">
      <!-- Шапка документа -->
      <div class="header">
        <h2>Транспортная компания Общество с ограниченной ответственностью «СИСТЕМ ЛОДЖИСТИКС»</h2>
        <p>ИНН 7805717259</p>
        
        <div class="addresses">
          <div class="address-section">
            <strong>Для отправки курьером:</strong>
            <p>пл. Конституции, 2, Санкт-Петербург, 196247, БЦ К2, офис 308.</p>
          </div>
          <div class="address-section">
            <strong>Для отправки почтой России:</strong>
            <p>Ленинский пр-т., 147, Санкт-Петербург, 196247.</p>
            <p>Получатель ООО «Систем Лоджистикс»</p>
          </div>
        </div>
      </div>

      <!-- Основная форма -->
      <div class="main-form">
        <h1>ДОГОВОР-ЗАЯВКА НА ПЕРЕВОЗКУ ГРУЗА № /П-25 от __.__.20__</h1>
        
        <div class="company-info">
          <strong>Заказчик: ООО «Систем Лоджистикс»</strong>
        </div>

        <!-- Таблица загрузки/разгрузки -->
        <table class="loading-table">
          <thead>
            <tr>
              <th colspan="2">ЗАГРУЗКА</th>
              <th colspan="2">РАЗГРУЗКА</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <label>Адрес:</label>
                <input type="text" v-model="form.loading.address" 
                       value="by CMR RU RUS servis terminal KRIEVJJA (Терехово-Бурачки)" readonly>
              </td>
              <td>
                <label>Дата:</label>
                <input type="date" v-model="form.loading.date">
              </td>
              <td>
                <label>Адрес:</label>
                <input type="text" v-model="form.unloading.address" 
                       value="by CMR +Возврат прицепа в МАП ТереховоКурачки в течении 5 дней" readonly>
              </td>
              <td>
                <label>Дата:</label>
                <input type="date" v-model="form.unloading.date">
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <label>Время:</label>
                <input type="text" v-model="form.loading.time" 
                       value="Документы на таможню подать до 9 утра">
              </td>
              <td colspan="2">
                <label>Время:</label>
                <input type="text" v-model="form.unloading.time">
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Таблица информации о грузе -->
        <table class="cargo-table">
          <thead>
            <tr>
              <th>Наименование и характер груза</th>
              <th>Кол-во мест</th>
              <th>Вес, тонн</th>
              <th>Объем, м³</th>
              <th>Требуемый тип транспорта</th>
              <th>Комплектация груза</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="text" v-model="form.cargo.name"></td>
              <td><input type="text" v-model="form.cargo.quantity"></td>
              <td><input type="number" v-model="form.cargo.weight" step="0.01"></td>
              <td><input type="number" v-model="form.cargo.volume" step="0.01"></td>
              <td><input type="text" v-model="form.cargo.transportType"></td>
              <td><input type="text" v-model="form.cargo.equipment"></td>
            </tr>
          </tbody>
        </table>

        <!-- Особые условия -->
        <div class="special-conditions">
          <table>
            <tr>
              <td style="width: 50%">
                <label>Особые условия и требования:</label>
                <textarea v-model="form.specialConditions" rows="3"></textarea>
              </td>
              <td style="width: 25%">
                <label>Тип загрузки:</label>
                <input type="text" v-model="form.loadingType">
              </td>
              <td style="width: 25%">
                <label>Тип выгрузки:</label>
                <input type="text" v-model="form.unloadingType">
              </td>
            </tr>
          </table>
        </div>

        <!-- Финансовая информация -->
        <table class="financial-table">
          <tr>
            <td style="width: 50%">
              <label>Согласованная цена за перевозку:</label>
              <input type="text" v-model="form.agreedPrice">
            </td>
            <td style="width: 50%">
              <label>Условия и форма оплаты:</label>
              <input type="text" v-model="form.paymentTerms">
            </td>
          </tr>
        </table>

        <!-- Информация о водителе и транспорте -->
        <table class="driver-table">
          <tr>
            <td style="width: 33%">
              <label>ФИО водителя и телефон:</label>
              <input type="text" v-model="form.driver.name">
            </td>
            <td style="width: 33%">
              <label>Паспортные данные:</label>
              <input type="text" v-model="form.driver.passport">
            </td>
            <td style="width: 34%">
              <label>Транспортное средство:</label>
              <input type="text" v-model="form.driver.vehicle">
            </td>
          </tr>
        </table>

        <!-- Условия перевозки -->
        <div class="terms-section">
          <h3>Условия перевозки:</h3>
          <div class="terms-content">
            <p>Условия выполнения заказа определяются положениями законодательства РФ, Уставом автотранспорта и условиями настоящего Договора-заявки.</p>
            <p>Стороны договорились, что принятая по факсу или по электронной почте договор-заявка, подтвержденная печатями и подписями ответственных лиц, имеет юридическую силу. Заявка считается подтверждённой, если в течении 6 часов с момента получения заявки перевозчик её не отменил.</p>
            <p>Нормативное время на загрузку/выгрузку, (таможенное оформление) - 48 часа. Сверхнормативный простой оплачивается согласно тарифу – 10 000,00 руб (или 100,00 EUR) в сутки при наличии документов, подтверждающих сверхнормативное время ("простойный лист")</p>
            <p>Срыв загрузки менее чем за 48 часов по вине Перевозчика оплачивается в размере 100% от стоимости перевозки.</p>
            <p>При отсутствии генерального договора, данный договор-заявка имеет силу генерального договора на разовую перевозку и действительна копия с факсимильными печатями.</p>
            <p>Перевозчик несёт ответственность за груз с момента принятия груза к перевозке до момента сдачи груза грузополучателю (утрата, недостача, порча груза), на основании TIR и CMR конвенции и правил грузовых перевозок, в размере стоимости утраченного, недостающего или испорченного груза, указанного в транспортной накладной и иных товарно-сопроводительных документах.</p>
            <p>Предоставленный автотранспорт должен быть в технически исправном состоянии с необходимым оборудованием и документами. Перевозчик обязан иметь CMR страховку (если это предусмотрено условиями перевозки).</p>
            <p>Водитель должен своевременно не позднее 09 00 утра информировать о процессах погрузки/выгрузки</p>
            
            <h4>Дополнительные условия:</h4>
            <p>Обе стороны не несут ответственности при форс-мажорных обстоятельствах и незаконных действиях государственных органов.</p>
            <p>Если груз не доставлен в означенное место выгрузки в установленные сроки, штраф 100% от стоимости груза.</p>
            <p>В случае неявки на загрузку, или явке на технически не исправном автомобиле или не соответствующем запрошенным параметрам - штраф 50% от стоимости перевозки. Если а/м опаздывает на загрузку, выгрузку, таможню - штраф 20% от стоимости перевозки за каждый день опоздания.</p>
            <p>Мы работаем на основании Закона РФ о грузовых перевозках, на основании правил о международных грузовых перевозках, а также, в рамках TIR и CMR-конвенции.</p>
            <p>Без дополнительного заключенного (подписанного) письменного договора, перевозчик не может вести прямые переговоры с клиентами. (Грузоотправителями, грузополучателями или другими экспедиторами), или принимать от них прямые заказы. В случае нарушения данного пункта - штраф 500000,00 руб.</p>
          </div>
        </div>

        <!-- Реквизиты -->
        <div class="requisites-section">
          <h3>Реквизиты сторон:</h3>
          <table class="requisites-table">
            <tr>
              <th style="width: 50%">Исполнитель</th>
              <th style="width: 50%">Заказчик</th>
            </tr>
            <tr>
              <td>
                <label>От исполнителя:</label>
                <textarea v-model="form.executorDetails" rows="6" placeholder="Введите реквизиты исполнителя"></textarea>
              </td>
              <td>
                <div class="customer-requisites">
                  <strong>ООО «Систем Лоджистикс»</strong><br>
                  ИНН 7805717259<br>
                  КПП 780501001<br>
                  ОГРН 117784736013<br>
                  Юр. Адрес 198152, Санкт-Петербург г. Краснопутиловская ул, дом 15, литер А, помещение 16-Н, комната 2<br>
                  р/с 4070281031201109452 в Филиал «Корпоративный» ПАО «СОВКОМБАНК» (г. Москва)<br>
                  к/с 30101810445250000360<br>
                  БИК 044525360
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Кнопки действий -->
        <div class="actions">
          <button @click="saveForm" class="btn btn-primary">Сохранить заявку</button>
          <button @click="printForm" class="btn btn-secondary">Печать</button>
          <button @click="resetForm" class="btn btn-outline">Сбросить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TransportApplication',
  data() {
    return {
      form: {
        loading: {
          address: 'by CMR RU RUS servis terminal KRIEVJJA (Терехово-Бурачки)',
          date: '',
          time: 'Документы на таможню подать до 9 утра'
        },
        unloading: {
          address: 'by CMR +Возврат прицепа в МАП ТереховоКурачки в течении 5 дней',
          date: '',
          time: ''
        },
        cargo: {
          name: '',
          quantity: '',
          weight: '',
          volume: '',
          transportType: '',
          equipment: ''
        },
        specialConditions: '',
        loadingType: '',
        unloadingType: '',
        agreedPrice: '',
        paymentTerms: '',
        driver: {
          name: '',
          passport: '',
          vehicle: ''
        },
        executorDetails: ''
      }
    }
  },
  methods: {
    saveForm() {
      console.log('Сохранение формы:', this.form);
      // Здесь можно добавить логику сохранения данных
      alert('Заявка сохранена!');
    },
    printForm() {
      window.print();
    },
    resetForm() {
      if (confirm('Вы уверены, что хотите сбросить все данные?')) {
        this.form = {
          loading: {
            address: 'by CMR RU RUS servis terminal KRIEVJJA (Терехово-Бурачки)',
            date: '',
            time: 'Документы на таможню подать до 9 утра'
          },
          unloading: {
            address: 'by CMR +Возврат прицепа в МАП ТереховоКурачки в течении 5 дней',
            date: '',
            time: ''
          },
          cargo: {
            name: '',
            quantity: '',
            weight: '',
            volume: '',
            transportType: '',
            equipment: ''
          },
          specialConditions: '',
          loadingType: '',
          unloadingType: '',
          agreedPrice: '',
          paymentTerms: '',
          driver: {
            name: '',
            passport: '',
            vehicle: ''
          },
          executorDetails: ''
        };
      }
    }
  }
}
</script>

<style scoped>
.transport-application {
  font-family: 'Arial', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: white;
}

.document {
  border: 1px solid #ccc;
  padding: 30px;
  background: white;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
  padding-bottom: 20px;
}

.header h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.addresses {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.address-section {
  flex: 1;
  padding: 0 10px;
}

.main-form h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 18px;
}

.company-info {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
}

input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

input[readonly] {
  background-color: #f8f9fa;
  color: #666;
}

.terms-section, .requisites-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.terms-content p {
  margin-bottom: 10px;
  line-height: 1.5;
}

.customer-requisites {
  font-size: 12px;
  line-height: 1.4;
}

.actions {
  margin-top: 30px;
  text-align: center;
}

.btn {
  padding: 10px 20px;
  margin: 0 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn:hover {
  opacity: 0.8;
}

@media print {
  .actions {
    display: none;
  }
  
  .document {
    border: none;
    padding: 0;
  }
}

.loading-table,
.cargo-table,
.financial-table,
.driver-table,
.requisites-table {
  margin-bottom: 20px;
}

.special-conditions table {
  margin-bottom: 0;
}

label {
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
}
</style>