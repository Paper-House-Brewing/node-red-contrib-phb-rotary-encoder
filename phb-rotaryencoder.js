/**
 * Author: Richard P. Gonzales
 * Email: richard@paperhousebrewing.com 
 * Last Modified: August 28, 2019
 **/
 
module.exports = function(RED) {
    function PHB_RotaryEncoder(config) {
        RED.nodes.createNode(this,config);
        let node = this;

		const Rotary = require('raspberrypi-rotary-encoder');

		// WARNING ! This is WIRINGPI pin numerotation !! please see https://fr.pinout.xyz/pinout/wiringpi#*
		const rotary = new Rotary(
			config.clkpin,
			config.dtpin,
			config.swpin
		);

		rotary.on("rotate", function(delta, msg) {
			msg = {
				payload: delta
			};
			node.send([msg, false]);
			//node.log(delta);
		});
		rotary.on("pressed", () => {
			//node.log("Rotary switch pressed");
		});
		rotary.on("released", function(msg) {
			msg = {
				payload: 0
			};
			node.send([msg, true]);
			//node.log('click');
		});
    }
    RED.nodes.registerType("phb-rotaryencoder",PHB_RotaryEncoder);
};