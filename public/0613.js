// 模擬數據存儲
let priceData = [];
let chartPoints = []; // 存儲圖表數據點位置
let currentFilterYear = null;

// 取得所有價格資料（從後端）
function fetchPriceData(callback) {
    fetch('/api/price')
        .then(res => res.json())
        .then(data => {
            priceData = data;
            if (callback) callback();
        });
}

// 新增價格記錄（呼叫後端）
function addPriceRecord(record, callback) {
    fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    })
        .then(res => res.text())
        .then(() => {
            if (callback) callback();
        });
}

// 更新價格記錄（呼叫後端）
function updatePriceRecord(record, callback) {
    fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    })
        .then(res => res.text())
        .then(msg => {
            if (callback) callback();
        });
}

// 刪除價格記錄（呼叫後端）
function deletePriceRecord(id, callback) {
    fetch(`/api/records/${id}`, {
        method: 'DELETE'
    })
        .then(res => res.text())
        .then(msg => {
            if (callback) callback();
        });
}

// 載入價格表格（從後端）
function loadTable() {
    fetchPriceData(() => {
        // 依照時間排序（年、月、日）
        priceData.sort((a, b) => {
            const dateA = new Date(a.year, a.month - 1, a.date);
            const dateB = new Date(b.year, b.month - 1, b.date);
            return dateA - dateB;
        });
        const tbody = document.querySelector('#priceTable tbody');
        tbody.innerHTML = priceData.map(row =>
            `<tr>
                <td>${row.year}</td>
                <td>${row.month}</td>
                <td>${row.date}</td>
                <td>NT$ ${row.price}</td>
                <td>
                    <button class="btn" onclick="editRow(${row.id},${row.year},${row.month},${row.date},${row.price})">修改</button>
                    <button class="btn btn-secondary" onclick="deleteRow(${row.id})">刪除</button>
                </td>
            </tr>`
        ).join('');
        updateYearOptions();
        drawChart(currentFilterYear);
    });
}

function editRow(id, year, month, date, price) {
    document.getElementById('editBox').style.display = 'block';
    const form = document.getElementById('editForm');
    form.querySelector('input[name="id"]').value = id;
    form.querySelector('input[name="year"]').value = year;
    form.querySelector('input[name="month"]').value = month;
    form.querySelector('input[name="date"]').value = date;
    form.querySelector('input[name="price"]').value = price;
    document.getElementById('editMsg').innerHTML = '';
    document.getElementById('editBox').scrollIntoView({ behavior: 'smooth' });
}

// 刪除行
function deleteRow(id) {
    if (confirm('確定要刪除這筆記錄嗎？')) {
        deletePriceRecord(id, () => {
            loadTable();
            showMessage('msg', '記錄已刪除！');
        });
    }
}

// 載入動畫控制
document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');

    // 載入動畫持續時間
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');

        // 載入畫面淡出後顯示主要內容
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainContent.classList.add('show');
        }, 800); // 0.8秒後隱藏載入畫面
    }, 4000); // 4秒後開始淡出

    // 初始化其他功能
    initializeApp();
});

// 初始化應用程式
function initializeApp() {
    loadTable();
    updateYearOptions();
    drawChart();
    setupChartEvents();
    setupEventListeners();
}

// 顯示訊息
function showMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
        element.innerHTML = '';
    }, 3000);
}

// 更新年份選項
function updateYearOptions() {
    const yearSelect = document.getElementById('chartYear');
    const years = [...new Set(priceData.map(item => item.year))].sort();

    yearSelect.innerHTML = '<option value="">所有年份</option>';
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });
}

// 顯示提示框
function showTooltip(mouseX, mouseY, content) {
    const tooltip = document.getElementById('chartTooltip');
    tooltip.innerHTML = content;
    tooltip.style.left = mouseX + 'px';
    tooltip.style.top = (mouseY - 60) + 'px';
    tooltip.classList.add('show');
}

// 隱藏提示框
function hideTooltip() {
    const tooltip = document.getElementById('chartTooltip');
    tooltip.classList.remove('show');
}

// 繪製圖表（更新為黑金配色和修改軸標籤）
function drawChart(filterYear = null) {
    const canvas = document.getElementById('priceChart');
    const ctx = canvas.getContext('2d');
    let points = [];
    currentFilterYear = filterYear;

    // 設置畫布大小
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 過濾數據
    let filteredData = priceData;
    if (filterYear) {
        filteredData = priceData.filter(item => item.year == filterYear);
    }

    // 按日期排序
    filteredData.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, a.date);
        const dateB = new Date(b.year, b.month - 1, b.date);
        return dateA - dateB;
    });

    if (filteredData.length === 0) {
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '20px "Noto Sans TC"';
        ctx.textAlign = 'center';
        ctx.fillText('無數據可顯示', canvas.width / 2, canvas.height / 2);
        chartPoints = [];
        return;
    }

    // 計算圖表區域
    const padding = 80;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // 固定價格範圍：300-500
    const minPrice = 300;
    const maxPrice = 500;
    const priceRange = maxPrice - minPrice;

    // 繪製背景網格（深色主題）
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;

    // 垂直網格線
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i * chartWidth / 10);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();
    }

    // 水平網格線 - 對應固定價格區段
    const priceLabels = [300, 350, 400, 450, 500];
    for (let i = 0; i < priceLabels.length; i++) {
        const y = padding + chartHeight - (i * chartHeight / (priceLabels.length - 1));
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
    }

    // 計算數據點位置（月份對齊12格，1月沒資料時2月的點會在2月格）
    points = filteredData.map((item, index) => {
        const count = filteredData.length;
        const safeDivisor = (count > 1) ? (count - 1) : 1;  // 避免除以 0

        const x = padding + (index * chartWidth / safeDivisor);
        const y = padding + chartHeight - ((item.price - minPrice) / priceRange) * chartHeight;

        return { x, y, data: item };
    });

    // 存儲點位置供滑鼠事件使用
    chartPoints = points;

    // 繪製折線（金色主題）
    if (points.length > 1) {
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // 繪製陰影區域（金色透明）
        ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
        ctx.beginPath();
        ctx.moveTo(points[0].x, padding + chartHeight);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
        ctx.closePath();
        ctx.fill();
    }

    // 繪製數據點（金色主題）
    points.forEach((point, index) => {
        // 外圈
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fill();

        // 內圈
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // 光暈效果
        ctx.shadowColor = '#D4AF37';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 繪製X軸標籤
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px "Noto Sans TC"';
    ctx.textAlign = 'center';


    if (filterYear) {
        // 篩選特定年份：依月份對齊 (12 格)
        points = filteredData.map(item => {
            const x = padding + ((item.month - 1) * chartWidth / 11);
            const y = padding + chartHeight - ((item.price - minPrice) / priceRange) * chartHeight;
            return { x, y, data: item };
        });
    } else {
        // 所有年份：平均分布資料點在整條 X 軸
        points = filteredData.map((item, index) => {
            const x = padding + (index * chartWidth / (filteredData.length - 1 || 1));
            const y = padding + chartHeight - ((item.price - minPrice) / priceRange) * chartHeight;
            return { x, y, data: item };
        });
    }

    // 繪製Y軸標籤 - 固定價格區段
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px "Noto Sans TC"';
    ctx.textAlign = 'right';

    const priceLabelsForAxis = [300, 350, 400, 450, 500];
    for (let i = 0; i < priceLabelsForAxis.length; i++) {
        const price = priceLabelsForAxis[i];
        const y = padding + chartHeight - (i * chartHeight / (priceLabelsForAxis.length - 1));
        ctx.fillText(`NT$${price}`, padding - 10, y + 4);
    }

    // 繪製坐標軸
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;

    // Y軸
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();

    // X軸
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // 標題
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 18px "Playfair Display"';
    ctx.textAlign = 'center';
    ctx.fillText(filterYear ? `${filterYear}年價格趨勢` : '歷史價格趨勢', canvas.width / 2, 30);

    // 移除X軸標題（時間）
    // 移除Y軸標題（價格 (NT$)）
}

// 滑鼠事件處理
function setupChartEvents() {
    const canvas = document.getElementById('priceChart');
    const chartContainer = document.querySelector('.chart-container');

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 計算相對於圖表容器的滑鼠位置
        const containerRect = chartContainer.getBoundingClientRect();
        const containerMouseX = e.clientX - containerRect.left;
        const containerMouseY = e.clientY - containerRect.top;

        let foundPoint = null;
        const threshold = 20; // 增加滑鼠感應範圍

        // 檢查是否靠近任何數據點
        for (let point of chartPoints) {
            const distance = Math.sqrt(
                Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
            );
            if (distance <= threshold) {
                foundPoint = point;
                break;
            }
        }
        if (foundPoint) {
            showTooltip(containerMouseX, containerMouseY, `
                <div>日期：${foundPoint.data.year}/${foundPoint.data.month}/${foundPoint.data.date}</div>
                <div>價格：NT$${foundPoint.data.price}</div>
            `);
        } else {
            hideTooltip();
        }
    });
}
// 設置事件監聽器
function setupEventListeners() {
    // 價格表單提交
    document.getElementById('priceForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = e.target;
        const newRecord = {
            year: parseInt(form.year.value),
            month: parseInt(form.month.value),
            date: parseInt(form.date.value),
            price: parseFloat(form.price.value)
        };
        addPriceRecord(newRecord, () => {
            loadTable();
            form.reset();
            showMessage('msg', '價格記錄已成功新增！');
        });
    });

    // 編輯表單提交
    // 新增
    document.getElementById('priceForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = e.target;
        const newRecord = {
            year: parseInt(form.year.value),
            month: parseInt(form.month.value),
            date: parseInt(form.date.value),
            price: parseFloat(form.price.value)
        };
        addPriceRecord(newRecord, () => {
            loadTable();
            form.reset();
            showMessage('msg', '價格記錄已成功新增！');
        });
    });

    // 修改
    document.getElementById('editForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = e.target;
        const id = parseInt(form.querySelector('input[name=\"id\"]').value);
        const updatedRecord = {
            id: id,
            year: parseInt(form.year.value),
            month: parseInt(form.month.value),
            date: parseInt(form.date.value),
            price: parseFloat(form.price.value)
        };
        updatePriceRecord(updatedRecord, () => {
            loadTable();
            showMessage('editMsg', '記錄已成功更新！');
            setTimeout(() => {
                document.getElementById('editBox').style.display = 'none';
            }, 1500);
        });
    });

    // 取消編輯
    document.getElementById('cancelEdit').onclick = function () {
        document.getElementById('editBox').style.display = 'none';
    };

    // 更新圖表
    document.getElementById('updateChart').addEventListener('click', function () {
        const selectedYear = document.getElementById('chartYear').value;
        drawChart(selectedYear || null);
    });
}





