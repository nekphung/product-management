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


// Pagination
const buttonPagination = document.querySelectorAll("[button-pagination]");
if (buttonPagination) {
    let url = new URL(window.location.href);
    
    buttonPagination.forEach(button => {
        button.addEventListener("click", () => {
            const page = button.getAttribute("button-pagination");
            // console.log(page);
            url.searchParams.set("page", page);
            window.location.href = url.href;
        })
    })
}

// End Pagination

// Checkbox Multi
const checkboxMulti = document.querySelector("[checkbox-multi]");
if (checkboxMulti) {
    const inputCheckAll = checkboxMulti.querySelector("input[name='checkall']");
    const inputsId = checkboxMulti.querySelectorAll("input[name='id']");

    // console.log(inputCheckAll);
    // console.log(inputsId);
    inputCheckAll.addEventListener("click", () => {
        // console.log(inputCheckAll.checked);
        if (inputCheckAll.checked) {
            // console.log("Check tat ca");
            inputsId.forEach(input => {
                input.checked = true;
            })
        } else {
            // console.log("Bo check tat ca");
            inputsId.forEach(input => {
                input.checked = false;
            })
        }
    });

    inputsId.forEach((input) => {
        input.addEventListener("click", () => {
            const countChecked = checkboxMulti.querySelectorAll(
                "input[name='id']:checked"
            ).length;
            
            // console.log(countChecked);
            // console.log(inputsId.length);

            if (countChecked == inputsId.length) {
                inputCheckAll.checked = true;
            } else {
                inputCheckAll.checked = false;
            }
        });
    });
}

// End Checkbox Multi

// Form Change Multi
const formChangeMulti = document.querySelector("[form-change-multi]");
if (formChangeMulti) {
    // console.log(formChangeMulti);
    formChangeMulti.addEventListener("submit", (e) => {
        e.preventDefault(); // ngăn chặn load lại trang web
        // console.log(e);

        const checkboxMulti = document.querySelector("[checkbox-multi]");
        const inputsChecked = checkboxMulti.querySelectorAll(
            "input[name='id']:checked"
        );

        // console.log(inputsChecked);
        if (inputsChecked.length > 0) {
            let ids = [];
            const inputIds = formChangeMulti.querySelector("input[name='ids']");

            inputsChecked.forEach(input => {
                const id = input.value;
                ids.push(id);
            })
            // console.log(ids.join(", "));
            inputIds.value = ids.join(", ");

            formChangeMulti.submit();
        } else {
            alert("Vui lòng chọn ít nhất một bản ghi!");
        }
    })
}

// End Form Change Multi