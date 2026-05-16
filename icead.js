let now = new Date();

let currentYear = now.getFullYear();

let currentMonth = now.getMonth();

let editing = null;

let isLoggedIn = false;

/* ---------- FIREBASE ---------- */
let events = {};

/* ---------- carregar firebase ---------- */
async function loadEvents() {

  const ref =
    doc(window.db, "calendar", "events");

  const snap =
    await getDoc(ref);

  if (snap.exists()) {

    events =
      snap.data().events || {};

  }

  renderCalendar();

}

/* ---------- salvar firebase ---------- */
async function saveStorage() {

  const ref =
    doc(window.db, "calendar", "events");

  await setDoc(ref, {
    events
  });

}

/* ---------- modal readonly ---------- */
function setModalReadOnly(isReadOnly) {

  const fields = [
    'modalType',
    'modalHorario',
    'modalAbertura',
    'modalLouvor',
    'modalPalavra'
  ];

  fields.forEach(id => {

    const el = document.getElementById(id);

    if (el) {
      el.disabled = isReadOnly;
    }

  });

}

/* ---------- eventos fixos ---------- */
function ensureFixedEvents(year, month, containerEvents) {

  const totalDays =
    new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= totalDays; d++) {

    const dt = new Date(year, month, d);

    const iso =
      dt.toISOString().slice(0, 10);

    if (!containerEvents[iso]) {
      containerEvents[iso] = [];
    }

    const hasManualNoCulto =
      containerEvents[iso].some(
        e => e.type === 'Não teremos culto'
      );

    /* DOMINGO */
    if (dt.getDay() === 0) {

      if (
        !containerEvents[iso].some(
          e => e.type === 'EBD'
        )
      ) {

        containerEvents[iso].push({
          type: 'EBD',
          details: {},
          _auto: true
        });

      }

      if (
        !hasManualNoCulto &&
        !containerEvents[iso].some(
          e => e.type === 'Culto'
        )
      ) {

        containerEvents[iso].push({
          type: 'Culto',
          details: {},
          _auto: true
        });

      }

    }

    /* QUARTA */
    if (dt.getDay() === 3) {

      if (
        !hasManualNoCulto &&
        !containerEvents[iso].some(
          e => e.type === 'Culto'
        )
      ) {

        containerEvents[iso].push({
          type: 'Culto',
          details: {},
          _auto: true
        });

      }

    }

  }

}

/* ---------- render calendário ---------- */
function renderCalendar() {

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  document.getElementById(
    'monthTitle'
  ).textContent =
    monthNames[currentMonth] +
    ' / ' +
    currentYear;

  const evCopy =
    JSON.parse(JSON.stringify(events || {}));

  ensureFixedEvents(
    currentYear,
    currentMonth,
    evCopy
  );

  const calendar =
    document.getElementById('calendar');

  calendar.innerHTML = '';

  const firstDay =
    new Date(
      currentYear,
      currentMonth,
      1
    ).getDay();

  const total =
    new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

  /* espaços vazios */
  for (let b = 0; b < firstDay; b++) {

    const empty =
      document.createElement('div');

    empty.className = 'day';

    calendar.appendChild(empty);

  }

  /* dias */
  for (let d = 1; d <= total; d++) {

    const dateObj =
      new Date(
        currentYear,
        currentMonth,
        d
      );

    const iso =
      dateObj.toISOString().slice(0, 10);

    const div =
      document.createElement('div');

    div.className = 'day';

    div.innerHTML =
      `<strong>${d}</strong>`;

    const dayEvents =
      evCopy[iso] || [];

    dayEvents.forEach((ev, idx) => {

      const evDiv =
        document.createElement('div');

      let cls =
        (ev.type || 'Outro')
          .replace(/\s+/g, '_');

      evDiv.className =
        'event ' + cls;

      const det =
        ev.details || {};

      evDiv.innerHTML = `
        <strong>${ev.type}</strong><br>
        🕒 ${det.horario || '--:--'}
      `;

      evDiv.onclick = (e) => {

        e.stopPropagation();

        if (isLoggedIn) {

          openModalForEdit(
            iso,
            idx,
            ev
          );

        } else {

          openModalForView(ev);

        }

      };

      /* admin */
      if (isLoggedIn) {

        const actions =
          document.createElement('div');

        actions.className =
          'actions';

        /* editar */
        const editBtn =
          document.createElement('span');

        editBtn.className =
          'icon';

        editBtn.textContent =
          '✏️';

        editBtn.onclick = (e) => {

          e.stopPropagation();

          openModalForEdit(
            iso,
            idx,
            ev
          );

        };

        /* excluir */
        const delBtn =
          document.createElement('span');

        delBtn.className =
          'icon';

        delBtn.textContent =
          '🗑️';

        delBtn.onclick = (e) => {

          e.stopPropagation();

          confirmDelete(
            iso,
            idx
          );

        };

        actions.appendChild(editBtn);

        actions.appendChild(delBtn);

        evDiv.appendChild(actions);

      }

      div.appendChild(evDiv);

    });

    /* adicionar evento */
    div.onclick = () => {

      if (isLoggedIn) {

        openModalForAdd(iso);

      }

    };

    calendar.appendChild(div);

  }

}

/* ---------- adicionar ---------- */
function openModalForAdd(iso) {

  editing = null;

  setModalReadOnly(false);

  document.getElementById(
    'modalDate'
  ).value = iso;

  document.getElementById(
    'modalType'
  ).value = 'Culto';

  document.getElementById(
    'modalHorario'
  ).value = '';

  document.getElementById(
    'modalAbertura'
  ).value = '';

  document.getElementById(
    'modalLouvor'
  ).value = '';

  document.getElementById(
    'modalPalavra'
  ).value = '';

  document.getElementById(
    'modalDelete'
  ).style.display = 'none';

  document.getElementById(
    'save-event'
  ).style.display = 'inline-block';

  document.getElementById(
    'modalOverlay'
  ).style.display = 'flex';

}

/* ---------- editar ---------- */
function openModalForEdit(
  iso,
  idx,
  ev
) {

  editing = { iso, idx };

  setModalReadOnly(false);

  document.getElementById(
    'modalDate'
  ).value = iso;

  document.getElementById(
    'modalType'
  ).value = ev.type;

  document.getElementById(
    'modalHorario'
  ).value =
    ev.details?.horario || '';

  document.getElementById(
    'modalAbertura'
  ).value =
    ev.details?.abertura || '';

  document.getElementById(
    'modalLouvor'
  ).value =
    ev.details?.louvor || '';

  document.getElementById(
    'modalPalavra'
  ).value =
    ev.details?.palavra || '';

  document.getElementById(
    'modalDelete'
  ).style.display = 'inline-block';

  document.getElementById(
    'save-event'
  ).style.display = 'inline-block';

  document.getElementById(
    'modalOverlay'
  ).style.display = 'flex';

}

/* ---------- visualizar ---------- */
function openModalForView(ev) {

  setModalReadOnly(true);

  document.getElementById(
    'modalDate'
  ).value = '';

  document.getElementById(
    'modalType'
  ).value = ev.type;

  document.getElementById(
    'modalHorario'
  ).value =
    ev.details?.horario || '';

  document.getElementById(
    'modalAbertura'
  ).value =
    ev.details?.abertura || '';

  document.getElementById(
    'modalLouvor'
  ).value =
    ev.details?.louvor || '';

  document.getElementById(
    'modalPalavra'
  ).value =
    ev.details?.palavra || '';

  document.getElementById(
    'modalDelete'
  ).style.display = 'none';

  document.getElementById(
    'save-event'
  ).style.display = 'none';

  document.getElementById(
    'modalOverlay'
  ).style.display = 'flex';

}

/* ---------- fechar ---------- */
function closeModal() {

  document.getElementById(
    'modalOverlay'
  ).style.display = 'none';

  setModalReadOnly(false);

}

document
  .getElementById('modalCancel')
  .addEventListener(
    'click',
    closeModal
  );

/* ---------- salvar ---------- */
document
  .getElementById('save-event')
  .addEventListener('click', async () => {

    const iso =
      document.getElementById(
        'modalDate'
      ).value;

    const type =
      document.getElementById(
        'modalType'
      ).value;

    const horario =
      document.getElementById(
        'modalHorario'
      ).value.trim();

    const abertura =
      document.getElementById(
        'modalAbertura'
      ).value.trim();

    const louvor =
      document.getElementById(
        'modalLouvor'
      ).value.trim();

    const palavra =
      document.getElementById(
        'modalPalavra'
      ).value.trim();

    if (!events[iso]) {
      events[iso] = [];
    }

    const evObj = {
      type,
      details: {
        horario,
        abertura,
        louvor,
        palavra
      }
    };

    if (editing) {

      events[iso][editing.idx] =
        evObj;

    } else {

      events[iso].push(evObj);

    }

    await saveStorage();

    closeModal();

    renderCalendar();

  });

/* ---------- excluir ---------- */
document
  .getElementById('modalDelete')
  .addEventListener('click', async () => {

    if (!editing) return;

    const { iso, idx } = editing;

    events[iso].splice(idx, 1);

    if (events[iso].length === 0) {

      delete events[iso];

    }

    await saveStorage();

    closeModal();

    renderCalendar();

  });

/* ---------- confirmar exclusão ---------- */
async function confirmDelete(
  iso,
  idx
) {

  if (!confirm('Excluir evento?')) {
    return;
  }

  events[iso].splice(idx, 1);

  if (events[iso].length === 0) {

    delete events[iso];

  }

  await saveStorage();

  renderCalendar();

}

/* ---------- navegação ---------- */
document.getElementById(
  'prev'
).onclick = () => {

  currentMonth--;

  if (currentMonth < 0) {

    currentMonth = 11;

    currentYear--;

  }

  renderCalendar();

};

document.getElementById(
  'next'
).onclick = () => {

  currentMonth++;

  if (currentMonth > 11) {

    currentMonth = 0;

    currentYear++;

  }

  renderCalendar();

};

/* ---------- dark mode ---------- */
document.getElementById(
  'toggleDark'
).onclick = () => {

  document.body.classList.toggle(
    'dark'
  );

};

/* ---------- login ---------- */
document.getElementById(
  'btnLogin'
).onclick = () => {

  const user =
    prompt("Usuário:");

  const pass =
    prompt("Senha:");

  if (
    user === 'admin' &&
    pass === '1234'
  ) {

    isLoggedIn = true;

    alert("Login OK");

    document
      .querySelectorAll(".edit-only")
      .forEach(
        e => e.style.display = 'flex'
      );

    document.getElementById(
      'btnLogin'
    ).style.display = 'none';

    renderCalendar();

  } else {

    alert("Login inválido");

  }

};

/* ---------- EXPORTAR PDF ---------- */
function exportarPDF() {

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  doc.setFontSize(18);

  doc.text(
    "Calendário ICEAD",
    20,
    20
  );

  let y = 40;

  Object.keys(events).forEach(date => {

    events[date].forEach(ev => {

      const detalhes =
        ev.details || {};

      const texto =
        `${date} | ${ev.type} | ${detalhes.horario || '--:--'}`;

      doc.setFontSize(11);

      doc.text(
        texto,
        10,
        y
      );

      y += 10;

      if (y > 270) {

        doc.addPage();

        y = 20;

      }

    });

  });

  doc.save(
    "calendario-icead.pdf"
  );

}

/* ---------- EXPORTAR EXCEL ---------- */
function exportarExcel() {

  let tabela = `
    <table border="1">
      <tr>
        <th>Data</th>
        <th>Tipo</th>
        <th>Horário</th>
      </tr>
  `;

  Object.keys(events).forEach(date => {

    events[date].forEach(ev => {

      const detalhes =
        ev.details || {};

      tabela += `
        <tr>
          <td>${date}</td>
          <td>${ev.type}</td>
          <td>${detalhes.horario || ''}</td>
        </tr>
      `;

    });

  });

  tabela += `</table>`;

  const blob = new Blob(
    ['\ufeff' + tabela],
    {
      type:
        'application/vnd.ms-excel'
    }
  );

  const link =
    document.createElement('a');

  link.href =
    URL.createObjectURL(blob);

  link.download =
    'calendario-icead.xls';

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

}

/* ---------- iniciar ---------- */
loadEvents();
