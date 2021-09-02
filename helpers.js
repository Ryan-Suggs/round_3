/**
 * Like Promise.all except it only runs batchSize promises at once
 *
 * @param {*} proms an array of promoses
 * @param {*} batchSize an integer for how many promises should run at once
 */
async function batchPromiseRunner(proms, batchSize) {
	var promisesInBatchSize = [];
	while(proms.length > batchSize) {
		promisesInBatchSize.push(proms.splice(0, batchSize));
	}
	if(proms.length > 0) {
		//There were less than batchsize amounts of promises left, make sure to add them
		promisesInBatchSize.push(proms);
	}
	//Go through each array of batch size of promises, and complete promises before moving on
	for(var i = 0; i < promisesInBatchSize.length; i++) {
		let promiseObjBatch = promisesInBatchSize[i];
		let promiseArray = this.getPromiseArray(promiseObjBatch);
		await Promise.all(promiseArray);
	}
}

//Takes array of custom non-executed promise objects, then returns array of promises
function getPromiseArray(promiseObjBatch) {
	let promises = [];
	promiseObjBatch.forEach(promiseObj => {
		let promise = this.getPromise(promiseObj);
		promises.push(promise);
	});
	return promises;
}

//Turns custom non-executed promise object into a normal JS promise
function getPromise(promiseObj) {
	return promiseObj.func(promiseObj.inputs);
}

/**
 * this can only do 5 jobs at once, due to using an external API
 */
async function processPayment({
	amount,
	user_id,
}) {
	// this is just a stub
}

module.exports = {
	processPayment,
	batchPromiseRunner,
};
