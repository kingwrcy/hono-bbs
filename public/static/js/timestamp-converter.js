/**
 * Timestamp Converter
 * 
 * This script finds all elements with the data-timestamp attribute
 * and converts their UTC timestamps to local time in the format yyyy/MM/dd HH:mm:ss
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all elements with data-timestamp attribute
  const timestampElements = document.querySelectorAll('[data-timestamp]');
  
  // Format function to ensure numbers have leading zeros when needed
  const formatNumber = (num) => num.toString().padStart(2, '0');
  
  // Process each element
  timestampElements.forEach(element => {
    const utcTimestamp = element.getAttribute('data-timestamp');
    
    if (utcTimestamp) {
      // Create a Date object from the UTC timestamp
      // Add 'Z' to indicate UTC if it's not already there
      const date = new Date(utcTimestamp.endsWith('Z') ? utcTimestamp : utcTimestamp + 'Z');
      
      // Format the date as yyyy/MM/dd HH:mm:ss
      const year = date.getFullYear();
      const month = formatNumber(date.getMonth() + 1); // getMonth() is 0-indexed
      const day = formatNumber(date.getDate());
      const hours = formatNumber(date.getHours());
      const minutes = formatNumber(date.getMinutes());
      const seconds = formatNumber(date.getSeconds());
      
      const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      
      // Update the element's text content
      element.textContent = formattedDate;
    }
  });
});
