// button-status: tự định nghĩa nên đặt trong []
const buttonStatus = document.querySelectorAll("[button-status]");
if (buttonStatus.length > 0) {
    // let url = window.location.href;
    // Dùng new URL để có thể sửa được đường dẫn 
    let url = new URL(window.location.href);
    console.log(url);

    buttonStatus.forEach(button => {
        button.addEventListener("click", () => {
            const status = button.getAttribute("button-status");
            
            // console.log(status);

            // Set lại đường dẫn để truy cập 
            if(status) {
                url.searchParams.set("status", status);
            } else {
                url.searchParams.delete("status");
            }

            // console.log(url.href);
            // Chuyển hướng sang trang khác 
            window.location.href = url.href; 
        });
    });
}

// End Button Status 

// Form Search
const formSearch = document.querySelector("#form-search");
if (formSearch) {
    // Muốn tìm kiếm kết hợp với lọc 
    let url = new URL(window.location.href); // Lấy ra url để tìm kiếm trong cái đã lọc 
    formSearch.addEventListener("submit", (event) => {
        event.preventDefault(); // Ngăn chặn load lại trang khi tìm kiếm 

        const keyword = event.target.elements.keyword.value;

        if (keyword) {
            url.searchParams.set("keyword", keyword);
        } else {
            url.searchParams.delete("keyword");
        }
        // console.log(event);
        // console.log(event.target.elements.keyword.value);

        // Chuyển hướng sang url mới 
        window.location.href = url.href; 
    })
}
// End Form Search 