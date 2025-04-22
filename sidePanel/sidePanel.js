document.addEventListener('DOMContentLoaded', () => {
    const btn1 = document.getElementById('btn1');
    const btn2 = document.getElementById('btn2');
    const t1 = document.getElementById('t1');
    const t2 = document.getElementById('t2');

    btn1.addEventListener('click', () => {
        t1.style.display = 'block';
        t2.style.display = 'none';
        activate(btn1, btn2);
    });

    btn2.addEventListener('click', () => {
        t1.style.display = 'none';
        t2.style.display = 'block';
        activate(btn2, btn1);
    });
});

function activate(btn1, btn2) {
    btn1.style.backgroundColor = '#007bff';
    btn2.style.backgroundColor = '';
}
