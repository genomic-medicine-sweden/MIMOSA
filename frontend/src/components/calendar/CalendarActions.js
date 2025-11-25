import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import "@/components/calendar/CalendarActions.css";

const CalendarActions = ({ setDateRange }) => {
  const [days, setDays] = useState(null);

  const handleTodayClick = () => {
    const today = new Date();
    setDateRange([today, today]);
    setDays(null);
  };

  const handleLast30DaysClick = () => {
    const today = new Date();
    const last30Days = new Date();
    last30Days.setDate(today.getDate() - 30);
    setDateRange([last30Days, today]);
    setDays(null);
  };

  const handleClearClick = () => {
    setDateRange(null);
    setDays(null);
  };

  useEffect(() => {
    if (days && days > 0) {
      const today = new Date();
      const customDate = new Date();
      customDate.setDate(today.getDate() - days);
      setDateRange([customDate, today]);
    }
  }, [days, setDateRange]);

  return (
    <div className="custom-footer">
      <div className="custom-days-input">
        <InputNumber
          value={days}
          onValueChange={(e) => setDays(e.value)}
          placeholder="Days"
          min={1}
          className="custom-days-input-number"
        />
      </div>
      <span className="spacing"></span>

      <Button
        label="Last 30 Days"
        size="small"
        text
        raised
        onClick={handleLast30DaysClick}
      />
      <span className="spacing"></span>
      <Button
        label="Today"
        size="small"
        text
        raised
        onClick={handleTodayClick}
      />
      <div className="clear-button">
        <Button
          label="Clear"
          size="small"
          text
          raised
          onClick={handleClearClick}
        />
      </div>
    </div>
  );
};

export default CalendarActions;
