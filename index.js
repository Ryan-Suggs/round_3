const {
	processPayment,
	batchPromiseRunner
} = require('./helpers');
const charges = require('./charges');

/* =======================================================================
 * Methods for ledger items
 * ======================================================================= */

/**
 * This is an API endpoint.
 *
 * It takes two options: building_id or manager_id.
 * - Only one of these can be provided (if both are provided, it's an invalid request)
 *   - If building_id is given, then only items for that building should be returned.
 *   - If user_id is given, then only items for that user_id should be returned.
 *
 * @return an array of objects.
 *
 * The result array should be descending in time, with the most recent first.
 */
function getLedgerItems({ building_id, user_id }) {
	 const ledgerCharges = charges;
	 var filteredCharges;
	 if(building_id) {
		 	filteredCharges = ledgerCharges.filter(charge => building_id === charge.building_id);
	 }
	 if(user_id)	{
	 		filteredCharges = ledgerCharges.filter(charge => user_id === charge.user_id);
 	 }
	 var ledgerItems = this.createLedgerArray(filteredCharges);
	 //Sort ledger array by due_at field, with the most recently due being first
 	ledgerItems.sort(function(itemA, itemB){return itemB.due_at - itemA.due_at});
	 return ledgerItems;
}

/**
* @param filteredCharges an array of json charge objects to be converted into ledger objects
* Returns: Array of ledger objects
* 	- Objects in returned array will adhere to this example:
		{
			due_at: 1614556800,
			amount_usd: 9000.23,
			building_id: '1234-1234-1234-1234',
			charges: [
				// the associated charge items
			]
		}
		- Only one object will exists for each unique building_id & due_at pairing
*/
function createLedgerArray(filteredCharges) {
	/* Create and fill ledger item array */
	var ledgerItems = [];
	filteredCharges.forEach( charge => {
		//Get index of item with same building_id and same due_at time (there will be at max 1)
		let index = ledgerItems.findIndex(item => (item.building_id === charge.building_id && item.due_at === charge.due_at));
		if(index < 0) {
			//A ledger item has not been made for this building_id/due_at pair, AKA make one
			let ledgerItem = {
				due_at: charge.due_at,
				amount_usd: charge.amount,
				building_id: charge.building_id,
				charges: [
					charge
				]
			}
			ledgerItems.push(ledgerItem);
		} else {
			//This ledger item already exists
			ledgerItems[index].charges.push(charge); //Add charge to item's chares array
			ledgerItems[index].amount_usd += charge.amount_usd; //Add charge amount to item's total amount
		}
	})
	return ledgerItems;
}

/* =======================================================================
 * Methods for payment processing
 * ======================================================================= */

/**
 * This is an internal service job, which processes our payments on a daily basis.
 *
 * @param curDate a unix (seconds) timestamp
 */
async function processLedgerPayments({ curTime }) {
	const ledgerCharges = charges;
	//Get only charges that are past due
	var filteredCharges = ledgerCharges.filter(charge => {
			if(charge.due_at <= curTime) {
				//This charge is past due, so add it to array
				return true;
			};
			return false;
	});
	var ledgerItems = this.createLedgerArray(filteredCharges);
	var paymentPromises = [];
	//Go through ledgerItems that are past due
	ledgerItems.forEach( item => {
		let amount = item.amount_usd;
		let user_id = item.charges[0].user_id;
		//Create a custom promise object that has not been executed
		let func = function({arg1, arg2}) { return processPayment({arg1, arg2}) };
		let inputs = {amount, user_id};
		let promiseObj = this.createPromiseObjectNotExecuted(func, inputs);
		//Add custom promise object to paymentPromises array
		paymentPromises.push(promiseObj);
	});
	return batchPromiseRunner(paymentPromises, 5);
}

function createPromiseObjectNotExecuted(func, inputs) {
	return {
			func: func,
			inputs: inputs
	};
}
