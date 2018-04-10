const BrowserWindow = require('electron').remote.BrowserWindow
const path = require('path')
const settings = require('electron-settings')
const swal = require('sweetalert2');
const server_user = require("../server/server-user");
const server_attendance = require('../server/server-attendance')

const inputCard = document.getElementById('input-card');
const dashboardPresent = document.getElementById('dashboard-present')
const dashboardLeave = document.getElementById('dashboard-leave')
const dashboardNoPresent = document.getElementById('dashboard-no-present')
const queryTotal = document.getElementById('query-total');
const queryLeave = document.getElementById('query-leave');
const queryNoPresent = document.getElementById('query-no-present');
const tbody = document.getElementById('js-attendance-tbody');
const checkboxIsSignOut = document.getElementById('checkbox-is-sign-out');
const searchInput = document.getElementById('attendance-search-input');
const searchBtn = document.getElementById('attendance-search-btn');
let attendance_arr = [];
let isSignOut = false;
let signModeName = "sign-in";
let signKeyName = "sign_in";
let golbal = this;


// the switch_btn's event
checkboxIsSignOut.addEventListener("change", function (event) {
    isSignOut = this.checked;
    settings.set('isSignOut', isSignOut);
    updateAttandanceView();
})

// search for special content 
searchInput.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        searchBtn.click();
    }
})
searchBtn.addEventListener('click', function () {
    let attendance_arr = golbal.attendance_arr;
    let search_key = searchInput.value;
    if (!search_key) {
        showAttendanceData(attendance_arr);
        return;
    }
    let filter_attendance_arr = attendance_arr
        .filter(attendee => {
            return attendee.ID.includes(search_key) ||
                attendee.name.includes(search_key)
        })
    showAttendanceData(attendance_arr, filter_attendance_arr);
})

// swipe the card to sign the attendance
inputCard.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        let activity_id = settings.get('activity_id');
        let swipeCard = this.value;
        this.value = "";
        let attendance_arr = golbal.attendance_arr;
        let targetUser = attendance_arr.filter((attendance) => {
            return attendance.card == parseInt(swipeCard);
        })[0];
        if (!targetUser) {
            console.log("can't find the card")
            return;
        }
        let isSignOut = settings.get('isSignOut');
        server_attendance.swipeById(targetUser.user_id, activity_id, isSignOut, function (err) {
            updateAttandanceView();
        })
    }
})

// (click event) dashboard and attendace's tab
function cancelQueryControlSeleted() {
    var queryControlArr = document.querySelectorAll(".query-control-ul li");
    queryControlArr.forEach((query) => { query.classList.remove("is-selected") });
}
function changeTab(tabElement, attendance_mode) {
    return function () {
        cancelQueryControlSeleted();
        tabElement.classList.add("is-selected");
        searchInput.value = "";
        settings.set('attendance_display_type', attendance_mode);
        var activity_id = settings.get('activity_id');
        server_attendance.selectAttendanceByActivityId(activity_id, storeAttendanceArrAndShow);
    }
}
queryTotal.addEventListener('click', changeTab(queryTotal, "total"))
queryLeave.addEventListener('click', changeTab(queryLeave, "leave"))
queryNoPresent.addEventListener('click', changeTab(queryNoPresent, "no-present"))

dashboardPresent.addEventListener('click', ()=>{queryTotal.click()})
dashboardLeave.addEventListener('click', () => {queryLeave.click()})
dashboardNoPresent.addEventListener('click', () => {queryNoPresent.click()})


// using the way of clicking tab to update the lastest attendance
function updateAttandanceView() {
    var showMode = settings.get('attendance_display_type');
    if (showMode == "total") {
        queryTotal.click();
    } else if (showMode == "leave") {
        queryLeave.click();
    } else if (showMode == "no-present") {
        queryNoPresent.click();
    }
}

function storeAttendanceArrAndShow(err, attendance_arr) {
    if (err) {
        console.log(err);
        return;
    }
    golbal.attendance_arr = attendance_arr;
    showAttendanceData(attendance_arr);
    updateDashboard(attendance_arr);
}

function updateDashboard(attendance_arr) {
    let dashboardPresentData = document.querySelector('#dashboard-present .data')
    let dashboardLeaveData = document.querySelector('#dashboard-leave .data')
    let dashboardNoPresentData = document.querySelector('#dashboard-no-present .data')
    function countAttendance(counter, attendance) {
        if (attendance.is_leave) {
            counter.leave += 1;
        } else if (attendance[signKeyName]) {
            counter.present += 1;
        } else {
            counter.noPresent += 1;
        }
        return counter;
    }
    attCounter = {
        present: 0,
        leave: 0,
        noPresent: 0
    }
    attCounter = attendance_arr.reduce(countAttendance, attCounter);
    dashboardPresentData.innerText = attCounter.present;
    dashboardLeaveData.innerText = attCounter.leave;
    dashboardNoPresentData.innerText = attCounter.noPresent;
}
function showAttendanceData(attendance_arr, filter_attendance_arr) {
    let titleName = document.querySelector('.title-name');
    let tbody = document.getElementById('js-attendance-tbody')
    // get the attandace mode ( sign-in or sign-out )
    golbal.isSignOut = settings.get('isSignOut') || false;
    if (isSignOut) {
        golbal.signModeName = "sign-out";
        golbal.signKeyName = "sign_out";
        titleName.innerText = "簽退頁面";
    } else {
        golbal.signModeName = "sign-in";
        golbal.signKeyName = "sign_in";
        titleName.innerText = "簽到頁面";
    }
    // filter the attandce depending on how_type
    var attendance_display_type = settings.get('attendance_display_type');
    if (attendance_display_type == "leave") {
        attendance_arr = attendance_arr.filter(attendance => attendance.is_leave)
    }
    if (attendance_display_type == "no-present") {
        attendance_arr = attendance_arr.filter((attendance) => {
            return !attendance.is_leave && !attendance[signKeyName];
        })
    }
    if (filter_attendance_arr) {
        if (attendance_display_type == "leave") {
            filter_attendance_arr = filter_attendance_arr.filter(attendance => attendance.is_leave)
        }
        if (attendance_display_type == "no-present") {
            filter_attendance_arr = filter_attendance_arr.filter((attendance) => {
                return !attendance.is_leave && !attendance[signKeyName];
            })
        }
    }
    // initital the display attendace to empty
    tbody.innerHTML = `<tr class="emptyTr">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    </tr>`;
    if (filter_attendance_arr) {
        filter_attendance_arr.forEach(showOne);
    } else {
        attendance_arr.forEach(showOne);
    }
}

function showOne(attendance) {
    let newTr = document.createElement('tr');
    newTr.innerHTML = `
            <td class="user_id" >${attendance.user_id}</td>
            <td class="name">${attendance.name}</td>
            <td class="${signModeName}-status"></td>
            <td class="${signModeName}-time">--:--</td>
            <td class="operate"></td>
        `;
    const operateTd = newTr.querySelector(".operate");
    const statusTd = newTr.querySelector(`.${signModeName}-status`);
    const signTimeTd = newTr.querySelector(`.${signModeName}-time`);
    if (attendance.is_leave) {
        statusTd.innerText = "請假";
        if (!isSignOut) {
            operateTd.innerHTML = `
                    <button class="cancelLeaveBtn">取消請假</button>
                `;
        }
        newTr.classList.add("is-leave");
    } else {
        if (attendance[signKeyName]) {
            var signDate = new Date(attendance[signKeyName]);
            var hours = signDate.getHours();
            var minutes = signDate.getMinutes();
            hours = (hours < 10) ? '0' + hours : hours;
            minutes = (minutes < 10) ? '0' + minutes : minutes;
            signTimeTd.innerText = `${hours}:${minutes}`;
            if (isSignOut) {
                statusTd.innerText = "已簽退";
                operateTd.innerHTML += `
                        <button class="signOutBtn" disabled>手動簽退</button>
                    `
            } else {
                statusTd.innerText = "已簽到";
                operateTd.innerHTML += `
                        <button class="setLeaveBtn" disabled>請假</button>
                        <button class="signInBtn" disabled>手動簽到</button>
                    `;
            }
        } else {
            if (isSignOut) {
                statusTd.innerText = "未簽退";
                operateTd.innerHTML += `
                        <button class="signOutBtn">手動簽退</button>
                    `
            } else {
                statusTd.innerText = "未簽到";
                operateTd.innerHTML += `
                        <button class="setLeaveBtn">請假</button>
                        <button class="signInBtn">手動簽到</button>
                    `;
            }
        }
        if (!attendance.card) {
            operateTd.innerHTML += `
                    <button class="setCardBtn">新增卡號</button>
                `;
        }
    }
    newTr.dataset.user_id = attendance.user_id;
    newTr.dataset.activity_id = attendance.activity_id;
    newTr.dataset.name = attendance.name;
    tbody.appendChild(newTr);
}

tbody.addEventListener('click', function (event) {
    const classList = event.target.classList;
    const targetTr = event.target.parentElement.parentElement;
    const user_id = targetTr.dataset.user_id;
    const activity_id = targetTr.dataset.activity_id;
    const name = targetTr.dataset.name;

    if (classList.contains("cancelLeaveBtn")) {
        dialogCancelLeave();
    } else if (classList.contains("setLeaveBtn")) {
        dialogSetLeave();
    } else if (classList.contains("signInBtn")) {
        dialogSignIn();
    } else if (classList.contains("signOutBtn")) {
        dialogSignOut();
    } else if (classList.contains("setCardBtn")) {
        dialogSetCard();
    }
})

function dialogCancelLeave(){
    swal({
        title: '取消請假',
        text: `${user_id} ${name} 取消請假`,
        type: 'info',
        showCancelButton: true,
        confirmButtonColor: '#010180',
        cancelButtonColor: '#aaa',
        cancelButtonText: '取消',
        confirmButtonText: '確認',
        reverseButtons: true
    }).then((result) => {
        if (result.value) {
            server_attendance.cancelLeaveById(user_id, activity_id, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                updateAttandanceView();
            })
        }
    })
}

function dialogSetLeave(){
    swal({
        title: '確定請假',
        text: `${user_id} ${name} 設定請假`,
        type: 'info',
        showCancelButton: true,
        confirmButtonColor: '#010180',
        cancelButtonColor: '#aaa',
        cancelButtonText: '取消',
        confirmButtonText: '確認',
        reverseButtons: true
    }).then((result) => {
        if (result.value) {
            server_attendance.setLeaveById(user_id, activity_id, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                updateAttandanceView();
            })
        }
    })
}

function dialogSignIn(){
        swal({
        title: '確定簽到',
        text: `${user_id} ${name} 手動簽到`,
        type: 'info',
        showCancelButton: true,
        confirmButtonColor: '#010180',
        cancelButtonColor: '#aaa',
        cancelButtonText: '取消',
        confirmButtonText: '簽到',
        reverseButtons: true
    }).then((result) => {
        if (result.value) {
            server_attendance.signInById(user_id, activity_id, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                updateAttandanceView();
            })
        }
    })
}

function dialogSignOut(){
    swal({
        title: '確定簽退',
        text: `${user_id} ${name} 手動簽退`,
        type: 'info',
        showCancelButton: true,
        confirmButtonColor: '#010180',
        cancelButtonColor: '#aaa',
        cancelButtonText: '取消',
        confirmButtonText: '簽退',
        reverseButtons: true
    }).then((result) => {
        if (result.value) {
            server_attendance.signOutById(user_id, activity_id, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                updateAttandanceView();
            })
        }
    })
}

function dialogSetCard(){
    swal({
        title: `${user_id} ${name}`,
        input: 'text',
        inputPlaceholder: '請刷卡或輸入卡號',
        showCancelButton: true,
        confirmButtonColor: '#010180',
        cancelButtonColor: '#aaa',
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        reverseButtons: true
    }).then((result) => {
        if (result.value) {
            let card = result.value;

            server_user.updateUserCard(user_id, card, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                updateAttandanceView();
                card_input.focus();
            })
        }
    })
}

(function initital() {
    let isSignOut = settings.get('isSignOut');
    checkboxIsSignOut.checked = isSignOut;
})();