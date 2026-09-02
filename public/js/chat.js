const chatBody = document.querySelector(".chat .inner-body");

const scrollChatToBottom = (behavior = "auto") => {
    if (!chatBody) return;
    requestAnimationFrame(() => {
        chatBody.scrollTo({
            top: chatBody.scrollHeight,
            behavior
        });
    });
};

scrollChatToBottom();

// CLIENT_SEND_MESSAGE
const formSendData = document.querySelector(".chat .inner-form");
if (formSendData) {
    formSendData.addEventListener("submit", (e) => {
        e.preventDefault();
        const content = e.target.elements.content.value;
        console.log(content);
        if (content) {
            socket.emit("CLIENT_SEND_MESSAGE", content);
            e.target.elements.content.value = "";
        }
    })
}

// END CLIENT_SEND_MESSAGE

// SERVER_RETURN_MESSAGE
socket.on("SERVER_RETURN_MESSAGE", (data) => {
    // console.log(data);
    const myId = document.querySelector("[my-id]").getAttribute("my-id");
    const body = chatBody;
    if (!body) return;

    console.log(myId);

    let htmlFullName = "";
    const div = document.createElement("div");
    if (myId == data.userId) {
        div.classList.add("inner-outgoing");
    } else {
        div.classList.add("inner-incoming");
        htmlFullName = `<div class="inner-name">${data.fullName}</div>`;
    }
    div.innerHTML = `
        ${htmlFullName}
        <div class="inner-content">${data.content}</div>
    `;
    body.appendChild(div);
    scrollChatToBottom("smooth");
})
// END SERVER_RETURN_MESSAGE


