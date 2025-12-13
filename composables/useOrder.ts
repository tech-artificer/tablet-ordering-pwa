// composables/useOrder.js
import { reactive, computed } from 'vue';

export const state = reactive({
  view: 'packages', // 'packages' | 'menu'
  selected: null,
  guests: 2,
  tab: 'meats',
  order: [],
  modal: null,
});

export function useOrder() {
  function selectPkg(pkg) {
    state.selected = pkg;
    state.view = 'menu';
    state.order = [];
    state.modal = null;
  }

  function backToPackages() {
    state.view = 'packages';
    state.selected = null;
  }

  function changeGuests(delta) {
    state.guests = Math.max(1, state.guests + delta);
  }

  function changeTab(tab) {
    state.tab = tab;
  }

  function addItem(item) {
    const existing = state.order.find(i => i.id === item.id);
    if (existing) existing.qty++;
    else state.order.push({ ...item, qty: 1 });
  }

  function removeItem(id) {
    state.order = state.order.filter(i => i.id !== id);
  }

  function updateQty(id, qty) {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    const it = state.order.find(i => i.id === id);
    if (it) it.qty = qty;
  }

  function clearOrder() {
    state.order = [];
  }

  const packageTotal = computed(() => {
    if (!state.selected) return 0;
    return state.selected.price * state.guests;
  });

  const addonsTotal = computed(() => {
    return state.order.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  });

  const tax = computed(() => (packageTotal.value + addonsTotal.value) * 0.12);
  const grandTotal = computed(() => packageTotal.value + addonsTotal.value + tax.value);

  return {
    state,
    selectPkg,
    backToPackages,
    changeGuests,
    changeTab,
    addItem,
    removeItem,
    updateQty,
    clearOrder,
    packageTotal,
    addonsTotal,
    tax,
    grandTotal,
  };
}