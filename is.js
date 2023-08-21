/* eslint {guard-for-in: 0, no-undef:0} */
module.exports.nullOrEmpty = thing => thing === null || thing === undefined || (Array.isArray(thing) && thing.length === 0) || (thing.constructor === Object && objectIsEmpty(thing)) || /^\s*$/.test(thing);
objectIsEmpty = obj => { for (const prop in obj) return false; return true; }; // eslint-disable-line no-unreachable-loop
module.exports.string = obj => Object.prototype.toString.call(obj) === '[object String]';
