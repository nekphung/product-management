// button-status: tự định nghĩa nên đặt trong []
const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
const adminSidebar = document.querySelector(".sider");
if (sidebarToggle && adminSidebar) {
  sidebarToggle.addEventListener("click", () => adminSidebar.classList.toggle("is-open"));
}

const adminBackButton = document.querySelector("[data-admin-back]");
if (adminBackButton) {
  adminBackButton.addEventListener("click", () => {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const isPreviousAdminPage = referrer
      && referrer.origin === window.location.origin
      && referrer.pathname !== window.location.pathname;

    if (isPreviousAdminPage) {
      history.back();
    } else {
      window.location.href = adminBackButton.dataset.backFallback;
    }
  });
}

// Highlight the current admin section in the sidebar.
const adminNavLinks = document.querySelectorAll("[data-admin-nav]");
if (adminNavLinks.length > 0) {
  const currentPath = window.location.pathname.replace(/\/$/, "");
  let activeLink = null;

  adminNavLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname.replace(/\/$/, "");
    if (currentPath === linkPath || currentPath.startsWith(`${linkPath}/`)) {
      if (!activeLink || linkPath.length > new URL(activeLink.href).pathname.replace(/\/$/, "").length) activeLink = link;
    }
  });

  if (activeLink) activeLink.classList.add("is-active");
}

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
    formChangeMulti.addEventListener("submit", async (e) => {
        e.preventDefault(); // ngăn chặn load lại trang web
        // console.log(e);

        const checkboxMulti = document.querySelector("[checkbox-multi]");
        const inputsChecked = checkboxMulti.querySelectorAll(
            "input[name='id']:checked"
        );

        const typeChange = e.target.elements.type.value;
        
        if (typeChange == "delete-all") {
            const entityLabel = formChangeMulti.dataset.entityLabel || "bản ghi";
            const isConfirm = await window.adminConfirm({
                title: "Xác nhận xóa hàng loạt",
                message: `Bạn có chắc muốn xóa những ${entityLabel} đã chọn?`,
                confirmText: "Xóa đã chọn"
            });

            if (!isConfirm) {
                return;
            }
        }

        // console.log(inputsChecked);
        if (inputsChecked.length > 0) {
            let ids = [];
            const inputIds = formChangeMulti.querySelector("input[name='ids']");

            inputsChecked.forEach(input => {
                const id = input.value;

                if (typeChange == "change-position") {
                    const position = input
                        .closest("tr")
                        .querySelector("input[name='position']").value;

                    ids.push(`${id}-${position}`);
                } else {
                    ids.push(id);   
                }    
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

// Show Alert 
const showAlert = document.querySelector("[show-alert]");
if (showAlert) {
    const time = parseInt(showAlert.getAttribute("data-time"));
    const closeAlert = showAlert.querySelector("[close-alert]");

    setTimeout(() => {
        showAlert.classList.add("alert-hidden");
    }, time);

    closeAlert.addEventListener("click", () => {
        showAlert.classList.add("alert-hidden");
    })
}

// End Show Alert 

// Upload Image 
const uploadImage = document.querySelector("[upload-image]");
if (uploadImage) {
    const uploadImageInput = document.querySelector("[upload-image-input]");
    const uploadImagePreview = document.querySelector("[upload-image-preview]");

    uploadImageInput.addEventListener("change", (e) => {
        console.log(e);
        const file = e.target.files[0];
        if (file) {
            uploadImagePreview.src = URL.createObjectURL(file);
        }
    });
}

const multipleImageUploads = document.querySelectorAll("[upload-multiple-images]");
multipleImageUploads.forEach((uploadArea) => {
    const input = uploadArea.querySelector("[upload-multiple-input]");
    const preview = uploadArea.querySelector("[upload-multiple-preview]");
    if (!input || !preview) return;

    input.addEventListener("change", () => {
        preview.innerHTML = "";
        Array.from(input.files).slice(0, 10).forEach((file, index) => {
            const figure = document.createElement("figure");
            figure.className = "admin-product-image-preview";
            const image = document.createElement("img");
            image.src = URL.createObjectURL(file);
            image.alt = `Ảnh xem trước ${index + 1}`;
            image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
            const caption = document.createElement("figcaption");
            caption.textContent = index === 0 ? "Ảnh đại diện" : `Ảnh ${index + 1}`;
            figure.append(image, caption);
            preview.appendChild(figure);
        });
    });
});

// End Upload Image 

// Sort 
const sort = document.querySelector("[sort]");
if (sort) {
    let url = new URL(window.location.href);

    const sortSelect = sort.querySelector("[sort-select]");
    const sortClear = sort.querySelector("[sort-clear]");

    // Sap xep 
    sortSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        // console.log(value.split("-"));
        const [sortKey, sortValue] = value.split("-");

        // console.log(sortKey);
        // console.log(sortValue);
        url.searchParams.set("sortKey", sortKey);
        url.searchParams.set("sortValue", sortValue);

        window.location.href = url.href;
    });
    
    // Xoa sap xep 
    sortClear.addEventListener("click", () => {
        url.searchParams.delete("sortKey");
        url.searchParams.delete("sortValue");

        window.location.href = url.href;
    });

    // Them selected cho option 
    const sortKey = url.searchParams.get("sortKey");
    const sortValue = url.searchParams.get("sortValue");

    // console.log(sortKey);
    // console.log(sortValue);

    if (sortKey && sortValue) {
        const stringSort = `${sortKey}-${sortValue}`;
        // console.log(stringSort);
        const optionSelected = sortSelect.querySelector(`option[value='${stringSort}`);

        optionSelected.selected = true;
    }
}

// End Sort
