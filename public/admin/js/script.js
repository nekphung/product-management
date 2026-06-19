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

            console.log(url.href);
            // Chuyển hướng sang trang khác 
            window.location.href = url.href; 
        });
    });
}

// End Button Status 