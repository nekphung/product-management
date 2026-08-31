const ORDER_STATUSES = [
    { value: "pending", label: "Chờ xác nhận", shortLabel: "Chờ xác nhận", step: 1 },
    { value: "confirmed", label: "Đã xác nhận", shortLabel: "Đã xác nhận", step: 2 },
    { value: "shipping", label: "Đang giao hàng", shortLabel: "Đang giao", step: 3 },
    { value: "completed", label: "Đã hoàn tất", shortLabel: "Hoàn tất", step: 4 },
    { value: "cancelled", label: "Đơn hàng đã hủy", shortLabel: "Đã hủy", step: 0 }
];

const DEFAULT_STATUS = ORDER_STATUSES[0];

const getOrderStatus = status => (
    ORDER_STATUSES.find(item => item.value === status) || DEFAULT_STATUS
);

module.exports = {
    ORDER_STATUSES,
    getOrderStatus
};
