module.exports = (query) => {
    // Cái này sẽ được load lại sau mỗi request 
    let filterStatus = [
        {
            name: "Tất cả",
            status: "",
            class: ""
        },
        {
            name: "Hoạt động",
            status: "active",
            class: ""
        },
        {
            name: "Dừng hoạt động",
            status: "inactive",
            class: ""
        }
    ];

    if (query.status) {
        const index = filterStatus.findIndex(item => {
            return item.status == query.status;   
        });
        filterStatus[index].class="active";
        // console.log(index);
    } else {
        const index = filterStatus.findIndex(item => {
            return item.status == "";   
        });
        filterStatus[index].class="active";
    };

    return filterStatus;
}