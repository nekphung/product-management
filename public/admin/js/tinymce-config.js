tinymce.init({ 
    selector: 'textarea.textarea-mce', 
    height: 400, 
    menubar: false, 
    license_key: 'gpl',
    
    // 1. Thêm các plugins tính năng vào đây
    plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    
    // 2. Tùy chỉnh thanh công cụ (toolbar) hiển thị
    toolbar: 'undo redo | blocks | ' +
             'bold italic underline strikethrough | forecolor backcolor | ' +
             'alignleft aligncenter alignright alignjustify | ' +
             'bullist numlist outdent indent | ' +
             'link image media table | fullscreen preview code'
});