function makeLayout(rows, columns, count) {
  const result = [];
  let remaining = Math.max(0, Number(count) || 0);
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowName = String.fromCharCode(65 + rowIndex);
    const seats = [];
    for (let number = 1; number <= columns; number += 1) {
      if (remaining > 0) {
        seats.push(number);
        remaining -= 1;
      }
    }
    result.push({ row: rowName, seats });
  }
  return result;
}

function layoutCount(layout) {
  return layout.reduce(function (total, row) {
    return total + row.seats.length;
  }, 0);
}

export default function SeatArrangementEditor({ rows, seatsPerRow, seatCount, layout, onChange }) {
  const safeRows = Math.max(1, Number(rows) || 1);
  const safeColumns = Math.max(1, Number(seatsPerRow) || 1);
  const maxSeats = safeRows * safeColumns;
  const safeCount = Math.min(Math.max(1, Number(seatCount) || 1), maxSeats);
  const currentLayout = layout && layout.length ? layout : makeLayout(safeRows, safeColumns, safeCount);
  const activeCount = layoutCount(currentLayout);

  function updateGrid(name, value) {
    const number = Math.max(1, Number(value) || 1);
    const nextRows = name === "seating_rows" ? number : safeRows;
    const nextColumns = name === "seats_per_row" ? number : safeColumns;
    const nextMax = nextRows * nextColumns;
    const nextCount = Math.min(safeCount, nextMax);
    onChange({
      rows: nextRows,
      columns: nextColumns,
      count: nextCount,
      layout: makeLayout(nextRows, nextColumns, nextCount),
    });
  }

  function changeCount(value) {
    const number = Math.min(Math.max(1, Number(value) || 1), maxSeats);
    onChange({
      rows: safeRows,
      columns: safeColumns,
      count: number,
      layout: makeLayout(safeRows, safeColumns, number),
    });
  }

  function toggleSeat(rowName, number) {
    const nextLayout = currentLayout.map(function (row) {
      if (row.row !== rowName) {
        return { row: row.row, seats: [...row.seats] };
      }
      const hasSeat = row.seats.includes(number);
      if (hasSeat) {
        return { row: row.row, seats: row.seats.filter(function (seat) { return seat !== number; }) };
      }
      return { row: row.row, seats: [...row.seats, number].sort(function (a, b) { return a - b; }) };
    });
    onChange({
      rows: safeRows,
      columns: safeColumns,
      count: layoutCount(nextLayout),
      layout: nextLayout,
    });
  }

  return (
    <div className="seating-arrangement-box">
      <div>
        <span className="eyebrow">SEATING ARRANGEMENT</span>
        <h3>Plan the seats for this event</h3>
        <p className="hint">Set the total seats, rows, and seats in each row. Then click seats to make a custom shape.</p>
      </div>

      <div className="three seating-controls">
        <div className="image-field">
          <label className="field-label">Number of seats needed</label>
          <input type="number" min="1" max={maxSeats} value={safeCount} onChange={(e) => changeCount(e.target.value)} />
        </div>
        <div className="image-field">
          <label className="field-label">Number of rows</label>
          <input type="number" min="1" max="26" value={safeRows} onChange={(e) => updateGrid("seating_rows", e.target.value)} />
        </div>
        <div className="image-field">
          <label className="field-label">Seats / columns per row</label>
          <input type="number" min="1" max="50" value={safeColumns} onChange={(e) => updateGrid("seats_per_row", e.target.value)} />
        </div>
      </div>

      <div className="seating-total">
        <span>Selected seats: <strong>{activeCount}</strong></span>
        <span>Maximum grid: <strong>{maxSeats}</strong></span>
      </div>

      <div className="seat-preview">
        <div className="stage-label">STAGE / SCREEN</div>
        <div className="seat-map-scroll">
          <div className="seat-map">
            {Array.from({ length: safeRows }).map(function (_, rowIndex) {
              const rowName = String.fromCharCode(65 + rowIndex);
              const row = currentLayout.find(function (item) { return item.row === rowName; }) || { row: rowName, seats: [] };
              const half = Math.floor(safeColumns / 2);
              return (
                <div className="seat-row" key={rowName}>
                  <span className="seat-row-label">{rowName}</span>
                  <div className="seat-row-grid">
                    {Array.from({ length: safeColumns }).map(function (_, index) {
                      const number = index + 1;
                      const active = row.seats.includes(number);
                      const aisle = safeColumns >= 4 && number === half + 1;
                      return (
                        <button
                          type="button"
                          className={(active ? "seat-button selected " : "seat-button inactive-seat ") + (aisle ? "aisle-before" : "")}
                          key={rowName + number}
                          onClick={() => toggleSeat(rowName, number)}
                        >
                          {number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="hint">Green seats will appear in the attendee Choose your seats section. Click a seat to remove it or add it back.</p>
    </div>
  );
}
