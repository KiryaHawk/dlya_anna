let currentFromQuantity = 0;
let currentToQuantity = Infinity;
let showGibdd = true;

ymaps.ready(init);

function init() {
    fetch('anna.json')
        .then(r => r.json())
        .then(obj => {

            const myMap = new ymaps.Map('map', {
                center: [55.76, 37.64],
                zoom: 7
            });

            const objectManager = new ymaps.ObjectManager({
                clusterize: true,
                clusterIconLayout: 'default#pieChart'
            });

            myMap.geoObjects.add(objectManager);

            let minQ = Infinity;
            let maxQ = -Infinity;
            const features = [];

            obj.features.forEach(f => {
                if (!f.geometry || !Array.isArray(f.geometry.coordinates)) return;

                const [lon, lat] = f.geometry.coordinates.map(Number);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                f.geometry.coordinates = [lat, lon];

                const q = extractQuantity(f);
                const preset = f.options?.preset;
                const isBlue = preset === 'islands#blueIcon';

                if (!isBlue && q !== null) {
                    minQ = Math.min(minQ, q);
                    maxQ = Math.max(maxQ, q);
                    f.properties.quantity = q;
                }

                features.push(f);
            });

            if (minQ === Infinity) {
                minQ = 0;
                maxQ = 0;
            }

            obj.features = features;
            objectManager.add(obj);

            setupFilterUI(minQ, maxQ, objectManager);
        });
}

/* ======= Количество ======= */

function extractQuantity(feature) {
    if (feature.properties?.quantity !== undefined) {
        const q = Number(feature.properties.quantity);
        if (Number.isFinite(q)) return q;
    }

    const body = feature.properties?.balloonContentBody;
    if (typeof body === 'string') {
        const m = body.match(/Кол-во\s+ДК\s+за\s+месяц.*?>(\d+)/i);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

/* ======= UI ======= */

function setupFilterUI(minQ, maxQ, objectManager) {
    const panel = document.getElementById('filter-panel');
    const toggleBtn = document.getElementById('filter-toggle');
    const gibddBtn = document.getElementById('gibdd-toggle');

    const fr = document.getElementById('quantity-from-range');
    const tr = document.getElementById('quantity-to-range');
    const fi = document.getElementById('quantity-from-input');
    const ti = document.getElementById('quantity-to-input');
    const label = document.getElementById('filter-current-value');

    toggleBtn.onclick = () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    };

    gibddBtn.onclick = () => {
        showGibdd = !showGibdd;
        gibddBtn.classList.toggle('active', showGibdd);
        applyFilter(objectManager);
    };

    if (minQ === maxQ) maxQ++;

    [fr, tr, fi, ti].forEach(el => {
        el.min = minQ;
        el.max = maxQ;
        el.step = 1;
    });

    currentFromQuantity = minQ;
    currentToQuantity = maxQ;

    fr.value = fi.value = currentFromQuantity;
    tr.value = ti.value = currentToQuantity;

    function sync(fromV, toV) {
        fromV = Math.max(minQ, Math.min(fromV, maxQ));
        toV = Math.max(fromV, Math.min(toV, maxQ));

        currentFromQuantity = fromV;
        currentToQuantity = toV;

        fr.value = fi.value = fromV;
        tr.value = ti.value = toV;

        label.textContent = `Показываются точки с кол-вом от ${fromV} до ${toV}`;
        applyFilter(objectManager);
    }

    fr.oninput = () => sync(+fr.value, +tr.value);
    tr.oninput = () => sync(+fr.value, +tr.value);
    fi.oninput = () => sync(+fi.value, +ti.value);
    ti.oninput = () => sync(+fi.value, +ti.value);

    sync(currentFromQuantity, currentToQuantity);
}

/* ======= Фильтр ======= */

function applyFilter(objectManager) {
    objectManager.setFilter(obj => {
        const preset = obj.options?.preset;
        const isBlue = preset === 'islands#blueIcon';

        if (isBlue) return showGibdd;

        const q = extractQuantity(obj);
        if (q === null) return false;

        return q >= currentFromQuantity && q <= currentToQuantity;
    });
}
