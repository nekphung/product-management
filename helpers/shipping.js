const SHIPPING_METHODS = [
    {
        id: "standard",
        name: "Giao hàng tiêu chuẩn",
        provider: "Đơn vị vận chuyển đối tác",
        description: "Nhận hàng trong 3 - 5 ngày làm việc",
        fee: 30000,
        eta: "3 - 5 ngày"
    },
    {
        id: "express",
        name: "Giao hàng nhanh",
        provider: "Đơn vị vận chuyển đối tác",
        description: "Ưu tiên xử lý, nhận hàng trong 1 - 2 ngày",
        fee: 50000,
        eta: "1 - 2 ngày"
    },
    {
        id: "pickup",
        name: "Nhận tại cửa hàng",
        provider: "Cửa hàng",
        description: "Cửa hàng thông báo khi đơn sẵn sàng",
        fee: 0,
        eta: "Trong ngày"
    }
];

const getShippingMethod = id => SHIPPING_METHODS.find(item => item.id === id) || SHIPPING_METHODS[0];

module.exports = { SHIPPING_METHODS, getShippingMethod };
