<template>
  <div class="main-container">
    <div class="title-label">{{ table?.config?.displayName || props.tableName }}</div>
    <div class="table-operations">
      <a-button @click="find" class="button-variation-1"><span class="button-variation-1-label">Reload</span></a-button>
      <a-button @click="filterOpen" class="button-variation-1"><span class="button-variation-1-label">Filter</span></a-button>
      <a-button v-if="table?.config?.create" @click="() => formOpen(null)" class="button-variation-2"><span class="button-variation-2-label">Create</span></a-button>
      <a-button v-if="table?.config?.delete" @click="deleteItems" class="button-variation-2"><span class="button-variation-2-label">Delete</span></a-button>
      <a-upload
        style="margin-right: 8px;" v-if="table?.config?.import" name="csv-file" :before-upload="importCsv" :show-upload-list="false" :max-count="1"
        accept="text/csv"
      >
        <a-button class="button-variation-1"><span class="button-variation-1-label">Import</span></a-button>
      </a-upload>
      <a-button v-if="table?.config?.export" @click="exportCsv" class="button-variation-3"><span class="button-variation-3-label">Export</span></a-button>
      <a-button v-if="props?.filterKeys" @click="goBack" class="button-variation-1"><span class="button-variation-1-label">Back</span></a-button>
    </div>
    <a-table
      :columns="table.columns"
      :data-source="table.data"
      :pagination="table.pagination"
      :scroll="{ x: table.scrollX, y: tableHeight }"
      :loading="table.loading"
      size="small"
      @change="handleTableChange"
      :row-key="'__key'"
      :customRow="customRow"
      :customHeaderRow="customHeaderRow"
      :row-selection="rowSelection"
      class="main-table"
    >
      <!-- <template #action="item">
        <a-button @click="() => console.log(item)">{{ item.text }}</a-button>
      </template> -->
    </a-table>
    <a-drawer title="Filters (Max 10)" :width="512" :open="filterShow" :body-style="{ paddingBottom: '80px' }" @close="filterClose" placement="left">
      <a-form layout="vertical">
        <a-form-item v-for="(filter, index) of table.filters" :key="index">
          <a-input-group compact>
            <a-select style="width: 125px" placeholder="Column" v-model:value="filter.col">
              <a-select-option v-for="col of table.filterCols" :key="col.value" :value="col.value">{{ col.label }}</a-select-option>
            </a-select>
            <a-select style="width: 75px" placeholder="Operation" v-model:value="filter.op">
              <a-select-option v-for="op of table.filterOps" :key="op" :value="op">{{ op }}</a-select-option>
            </a-select>
            <a-input style="width: 125px" placeholder="Value" v-model:value="filter.val" />
            <a-select style="width: 75px" placeholder="And Or" v-model:value="filter.andOr">
              <a-select-option v-for="andOr of table.filterAndOr" :key="andOr" :value="andOr">{{ andOr }}</a-select-option>
            </a-select>
            <a-button type="primary" @click="() => filterDelete(index)">
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-input-group>
        </a-form-item>
      </a-form>
      <a-button :disabled="table.filters.length > 9" style="margin-bottom: 8px" @click="filterAdd" class="button-variation-1"><span class="button-variation-1-label">Add Filter</span></a-button>
      <a-button :disabled="table.filters.length === 0" style="margin-bottom: 8px; margin-left: 8px" @click="filterClearAll" class="button-variation-1"><span class="button-variation-1-label">Clear All</span></a-button>
      <div class="t4t-drawer">
        <a-button type="primary" @click="filterApply" style="margin-left: 25px" class="button-variation-2"><span class="button-variation-2-label">Apply</span></a-button>
      </div>
    </a-drawer>
    <a-drawer :title="formMode" :width="480" :open="!!formMode" :body-style="{ paddingBottom: '80px' }" @close="formClose">
      <a-form layout="vertical" :model="table.formData" :rules="table.formRules">
        <template v-for="(colObj, col, index) in table.formCols" :key="col">
          <a-form-item :label="colObj.title" :rules="colRequired(colObj.dataIndex)" v-if="colShow(colObj)">
            <!-- <a-input v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]"/> -->
            <!-- <div>{{ index }} {{ table.formData[col] }}</div><br/> -->
            <a-textarea v-if="colUiType(colObj, 'textarea')" v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]" />
            <a-select v-else-if="colUiType(colObj, 'select')" v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]" />
            <div v-else-if="colUiType(colObj, 'files')">
              <a-upload
                :file-list="table.formFiles[col]"
                :before-upload="(file) => beforeUpload(file,col)"
                @remove="(file) => handleRemove(file,col)"
                v-bind="table.formColAttrs[col]"
              >
                <a-button>
                  Select File
                </a-button>
              </a-upload>
              <div>{{ table.formData[col] }}</div>
              <a-image :alt="table.formData[col]" :width="200" :src="openImg(col)" />
            </div>
            <a-input v-else v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]"/>
            <!-- <div v-else>[{{ index }}] {{ table.formData[col] }}</div><br/> -->
          </a-form-item>
        </template>
        <!-- TBD single autocomplete, multi autocomplete, multi select, date, time date & time -->
      </a-form>
      <div class="t4t-drawer">
        <a-button v-if="table?.config?.update" style="margin-left: 25px" @click="formSubmit" class="button-variation-2"><span class="button-variation-2-label">Save Changes</span></a-button>
        <a-button style="margin-left: 10px" @click="formClose" class="button-variation-1"><span class="button-variation-1-label">Cancel</span></a-button>
      </div>
    </a-drawer>
  </div>
</template>
<script>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { notification } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { http } from '/src/plugins/fetch'
import { useMainStore } from '/src/store'

import * as t4tFe from '@es-labs/esm/t4t-fe' // Reference - https://github.com/es-labs/jscommon/blob/main/libs/esm/t4t-fe.js
import { jsonToCsv, downloadData } from '@es-labs/esm/util'

const filterTemplate = { col: '', op: '=', andOr: 'and', val: '' }
const DEFAULT_PAGE_SIZE = 10

export default {
  name: 'T4t',
  props: ['tableName', 'filterKeys', 'filterVals'],
  components: {
    CloseOutlined
  },
  setup(props, context) {
    console.log('t4t - v0.0.2')
    const store = useMainStore()
    const router = useRouter()
    // const loading = store.loading

    // table information
    const table = reactive({
      scroll: { x: 1800, y: 240 },
      pagination: { pageSize: DEFAULT_PAGE_SIZE, total: 0, current: 1 }, // start at page 1, 8 records per page
      sorter: null, // single sort only

      filters: [],
      filterCols: [],
      filterOps: ['like', '=', '!=', '>=', '>', '<', '<='], // isNull, isEmpty
      filterAndOr: ['and', 'or'],

      keyCols: [],
      data: [],
      loading: false,
      config: null,
      columns: [],

      formKey: null,
      formData: {},
      formFiles: {},
      formRules: {}, // To Remove
      formCols: {},
      formColAttrs: {}, // attributes for your inputs
      scrollX: 1800,
    })


    const filterShow = ref(false) // Filter drawer

    // Deletion
    const deleteItems = async () => {
      const numSelected = rowSelection.selectedRowKeys.length
      const { deleteLimit } = table.config 
      if (numSelected > deleteLimit) {
        return alert(`Limit is ${deleteLimit} record. ${numSelected} currently selected`)
      }
      const message = 'Delete Items'
      const duration = 3
      if (store.loading === false) {
        store.loading = true
        try {
          await t4tFe.remove(rowSelection.selectedRowKeys)
          await find()
          notification.open({ message, duration, description: 'Success' })
        } catch (e) {
          console.log('t4t delete error', e.toString())
          notification.open({ message, duration, description: 'Error' })
        }
        store.loading = false
      }
    }

    // File Handling
    const handleRemove = (file, col) => {
      const index = table.formFiles[col].indexOf(file)
      const newFileList = table.formFiles[col].slice()
      newFileList.splice(index, 1)
      table.formFiles[col] = newFileList
    }
    const beforeUpload = (file, col) => {
      console.log('beforeUpload')
      const maxFiles = table.config.cols[col]?.ui?.attrs?.maxCount || 0
      if (table.formFiles[col].length === maxFiles) {
        alert(`Maximum ${maxFiles} Files Exceeded. Remove a file before adding`) // have a problem, can keep popping up...
      } else {
        table.formFiles[col] = [...(table.formFiles[col] || []), file]
      }
      return false
    }

    // Add / Edit Form
    const formMode = ref(false) // false, add or edit
    const formOpen = async (item) => {
      table.formData = {}
      table.formFiles = {}
      table.formKey = null
      let rv = {}
      const mode = item ? 'edit' : 'add'

      try {
        if (mode === 'edit') {
          if (table.loading) return
          table.loading = true
          rv = await t4tFe.findOne(item.__key)
          table.formKey = item.__key
          table.loading = false
        }
        const cols = table.columns.filter((col) => col[mode] !== 'hide' && col.__type !== 'link')
        for (let col of cols) {
          table.formCols[col.dataIndex] = col
          table.formData[col.dataIndex] = mode === 'add' ? '' : rv[col.dataIndex] // get the data // TBD May need formatting?
          table.formColAttrs[col.dataIndex] = {
            ...col.ui?.attrs,
            // TBD... permissions for adding and editing...
            disabled: (mode === 'add' && col.add === 'readonly') || (mode === 'edit' && col.edit === 'readonly'),
            required: (mode === 'add' && col.add === 'required') || (mode === 'edit' && col.edit === 'required'),
          }
          // if (col?.ui?.tag === 'select') {
          //   console.log('yyyy', table.formColAttrs[col.dataIndex], table.formData[col.dataIndex])
          // }
          //
          table.formData[col.dataIndex] = mapRecordCol(table.formData, col.dataIndex)
          if (col?.ui?.tag === 'files') table.formFiles[col.dataIndex] = [] // add file
        }
      } catch (e) {
        console.log('formOpen', e.toString())
      }
      formMode.value = mode
    }
    const formSubmit = async () => {
      const formData = new FormData()
      for (const col in table.formFiles) {
        if (table.formFiles[col]?.length) {
          table.formData[col] = ''
          for (const file of table.formFiles[col]) {
            table.formData[col] = table.formData[col] ? table.formData[col] + ',' + file.name : file.name
            formData.append(col, file, file.name)
          }
        } else { // TBD clearing file
          // table.formData[col] = ''
        }
      }
      formData.append('json', JSON.stringify(table.formData))
      if (store.loading === false) {
        store.loading = true
        const message = formMode.value === 'add' ? 'Add' : 'Update'
        const duration = 3 // seconds
        try {
          if (formMode.value === 'add') {
            await t4tFe.create(formData)
          } else {
            await t4tFe.update(table.formKey, formData)
          }
          await find()
          notification.open({ message, duration, description: 'Success' })
        } catch (e) {
          console.log('t4t submit error', e.toString())
          notification.open({ message, duration, description: 'Error' })
        }
        store.loading = false
      }
      formMode.value = false
    }
    const rowSelection = reactive({
      selectedRowKeys: [],
      // Check here to configure the default column
      onChange: (selectedRowKeys) => {
        console.log('selectedRowKeys changed: ', selectedRowKeys)
        rowSelection.selectedRowKeys = selectedRowKeys
      }
    })
    const mapRecordCol = (record, _col) => {
      const colObj = table.config.cols[_col]
      if (colObj?.options) {
        const { display } = colObj.options
        if (display && record[_col][display]) {
          record[_col] = record[_col][display]
        } else if (typeof record[_col] !== 'string') { // TBD handle display === both
          record[_col] = JSON.stringify(record[_col])
        }
      }
      return record[_col]
    }
    const mapRecord = (record) => {
      for (const _col in table.config.cols) {
        const tableCol = table.config.cols[_col]
        if (tableCol.type === 'link') {
          record[_col] = tableCol?.link?.text || 'Click To View'
        } else if (record[_col]) {
          record[_col] = mapRecordCol(record, _col)
        }
      }
      return record
    }
    // const hasSelected = computed(() => state.selectedRowKeys.length > 0);
    const find = async () => {
      if (table.loading) return
      table.loading = true
      try {
        const filters = [ ...table.filters ]
        const { filterKeys, filterVals } = props // child table filter...
        if (filterKeys?.length && filterVals?.length) {
          const filterKeysA = filterKeys.split(',')
          const filterValsA = filterVals.split(',')
          for (const [index,value] of  filterKeysA.entries()) {
            filters.push({ andOr: "and", col: filterKeysA[index], op: "=", val: filterValsA[index] })
          }
        }
        const { results, total } = await t4tFe.find(filters, null, table.pagination.current, table.pagination.pageSize)
        // console.log('columns', table.columns, 'results', results, total)
        table.data = results.map(result => mapRecord(result)) // format the results...
        table.pagination.total = total
        // console.log(table.filters)
      } catch (e) {
        alert('Error find' + e.toString())
      }
      table.loading = false
    }

    // const getRowKey = (record) => table.keyCols.map(keyCol => record[keyCol]).join('|')

    onMounted(async () => {
      t4tFe.setFetch(http)
      t4tFe.setTableName(props.tableName)
      // console.log(props, context)

      if (store.loading === false) {
        store.loading = true
        try {
          table.config = await t4tFe.getConfig()
        } catch (e) {
          console.log('table config error', e.toString())
          alert('Error Loading Table Configuration')
        }
        if (table.config) {
          try {
            console.log('TABLE CONFIG', table.config)
            for (const key in table.config.cols) {
              const val = table.config.cols[key]
              if (val.multiKey || val.auto === 'pk') table.keyCols.push(key)

              const col = {
                title: val.label,
                dataIndex: key,
                filter: val.filter,
                sorter: val.sort,
                __type: val.type || 'text', // aka type
                add: val.add,
                edit: val.edit,
                ui: val.ui,
                customCell: (record, rowIndex, column) => {
                  return {
                    onClick: (event) => {
                      // console.log('onClick', rowIndex, record, column, event)
                      if (column?.__type === 'link') {
                        const key = column.dataIndex
                        const col = table.config.cols[key]
                        console.log(col)
                        let fvals = ''
                        const keys_a = col.link.keys.split(',')
                        for (const kk of keys_a) {
                          if (fvals) fvals += ',' + record[kk]
                          else fvals = record[kk]
                        }
                        // console.log(col.link.ctable, col.link.ckeys, fvals)
                        // TOCHECK replace with t4tfe parentFilter?
                        router.push({
                          path: '/t4t-link',
                          name: 'T4t-Link',
                          query: { fkeys: col.link.ckeys, fvals },
                          params: { table: col.link.ctable }
                        })
                      } else {
                        formOpen(record)
                      }
                    },
                  }
                },
              }
              if (!val.hide) table.columns.push(col)
            }
            table.filterCols = table.columns.filter((col) => col.filter).map((col) => ({ value: col.dataIndex, label: col.title }))
            await find()
          } catch (e) {
            console.log('table load error', e.toString())
            alert('Error Loading Table Data')
          }
        }
        store.loading = false
      }
    })

    const handleTableChange = async (pagination, filters, sorter) => {
      // console.log('handleTableChange', pagination, filters, sorter) // use own filters
      table.pagination = { ...pagination }
      table.sorter = { ...sorter }
      if (store.loading === false) {
        store.loading = true
        await find()
        store.loading = false
      }
    }

    // onClick, onDblclick, onMouseenter, onMouseleave, onContextmenu: (event) => {}
    const customRow = (record, index) => ({})
    const customHeaderRow = (column) => ({})

    // CSV
    const importCsv = async (file) => {
      try {
        const message = 'Import CSV'
        const duration = 3
        await t4tFe.upload(file)
        notification.open({ message, duration, description: 'Success' })
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' })
        console.log(e)
      }
      return false
    }
    const exportCsv = async () => {
      // FIX REPEATING CODE START
      const filters = [ ...table.filters ]
      const { filterKeys, filterVals } = props // child table filter...
      if (filterKeys?.length && filterVals?.length) {
        const filterKeysA = filterKeys.split(',')
        const filterValsA = filterVals.split(',')
        for (const [index,value] of  filterKeysA.entries()) {
          filters.push({ andOr: "and", col: filterKeysA[index], op: "=", val: filterValsA[index] })
        }
      }
      // FIX REPEATING CODE END

      const sorter = null
      const message = 'Export CSV'
      const duration = 3
      try {
        const data = await t4tFe.download(filters, sorter)
        downloadData(data.csv, (new Date()).toISOString() + '-' + props.tableName + '.csv')
        notification.open({ message, duration, description: 'Success' })
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' })
        console.log(e)
      }
    }

    // t4tFe.autocomplete

    //responsive table height
    const tableHeight = ref(0)
    const OFFSET_HEIGHT = 306 // IMPORTANT! - Adjust based on your layout (headers, footers, etc.)
    const handleResize = () => {
      const windowHeight = window.innerHeight
      tableHeight.value = windowHeight - OFFSET_HEIGHT
    };
    onMounted(() => {
      handleResize();
      window.addEventListener("resize", handleResize)
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize)
    });

    return {
      props,
      goBack: () => router.go(-1),
      find,
      colShow: (val) => (formMode.value === 'add' && val.add !== 'hide') || (formMode.value === 'edit' && val.edit !== 'hide'),
      colUiType: (val, uiType) => val?.ui?.tag === uiType,
      colRequired: (val) => {
        let isRequired = false
        const labelName = table.formCols[`${val}`].title
        let message = `${labelName} is required`
        const getColProp = table.formCols[`${val}`][`${formMode.value}`]

        if(getColProp && getColProp === 'required') {
          isRequired = true;
        }

        return [{ required: isRequired, message: message }]
      },
      openImg: (col) => { 
        // TBD handle multiple files
        const file = table.formData[col]
        const path = table.config.cols[col]?.ui?.url
        // console.log(path, file)
        return path + file + ''
      },
      table,
      handleTableChange,
      customRow,
      customHeaderRow,

      // filters
      filterShow,
      filterApply: async () => {
        if (store.loading === false) {
          store.loading = true
          await find()
          store.loading = false
        }
      },
      filterOpen: () => (filterShow.value = true),
      filterClose: () => (filterShow.value = false),
      filterAdd: () => table.filters.push({ ...filterTemplate }),
      filterClearAll: () => table.filters = [],
      filterDelete: (index) => table.filters.splice(index, 1),

      // csv
      importCsv, exportCsv,

      // forms
      formMode, formOpen, formSubmit,
      formClose: () => formMode.value = false,

      // others
      rowSelection,
      deleteItems,

      //responsive table height
      tableHeight,

      // files
      handleRemove, beforeUpload
    }
  }
}
</script>

<style scoped>
  @import 'T4t.css';
</style>
