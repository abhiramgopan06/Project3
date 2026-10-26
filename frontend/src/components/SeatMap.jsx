function groupSeatsByRow(seats) {
  const rows = [];
  for (const seat of seats) {
    let foundRow = null;
    for (const row of rows) {
      if (row.name === seat.row) {
        foundRow = row;
        break;
      }
    }
    if (foundRow) {
      foundRow.seats.push(seat);
    } else {
      rows.push({ name: seat.row, seats: [seat] });
    }
  }
  return rows;
}

export default function SeatMap({ seats, selectedSeats, onSeatClick }) {
  const rows = groupSeatsByRow(seats);
  const maxColumns = seats.reduce(function (max, seat) {
    return Math.max(max, Number(seat.column) || 0);
  }, 0);
  const aisleColumn = maxColumns >= 4 ? Math.floor(maxColumns / 2) + 1 : 0;

  return (
    <>
      <div className="seat-legend">
        <span><i className="seat-dot available-dot" /> Available</span>
        <span><i className="seat-dot selected-dot" /> Selected</span>
        <span><i className="seat-dot booked-dot" /> Booked</span>
      </div>

      <div className="stage-label">STAGE / SCREEN</div>

      <div className="seat-map-scroll">
        <div className="seat-map">
          {rows.map(function (row) {
            const rowMax = row.seats.reduce(function (max, seat) {
              return Math.max(max, Number(seat.column) || 0);
            }, 0);
            const columns = Math.max(maxColumns, rowMax);
            const byColumn = {};
            row.seats.forEach(function (seat) {
              byColumn[seat.column] = seat;
            });

            return (
              <div className="seat-row" key={row.name}>
                <span className="seat-row-label">{row.name}</span>
                <div className="seat-row-grid">
                  {Array.from({ length: columns }).map(function (_, index) {
                    const column = index + 1;
                    const seat = byColumn[column];
                    const aisle = column === aisleColumn;
                    if (!seat) {
                      return <span className={(aisle ? "seat-gap aisle-before" : "seat-gap")} key={row.name + "-gap-" + column} />;
                    }
                    const isSelected = selectedSeats.includes(seat.id);
                    let state = "available";
                    if (seat.status === "booked") {
                      state = "booked";
                    } else if (isSelected) {
                      state = "selected";
                    }
                    return (
                      <button
                        type="button"
                        key={seat.id}
                        title={seat.label + " · " + state}
                        aria-label={"Seat " + seat.label + ", " + state}
                        disabled={state === "booked"}
                        className={("seat-button " + state) + (aisle ? " aisle-before" : "")}
                        onClick={() => onSeatClick(seat)}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
