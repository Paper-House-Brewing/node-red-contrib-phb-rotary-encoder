let onOff = require('onoff');
let gpio = require('raspi-gpio');
let EventEmitter = require('eventemitter3');
let getPins = require('raspi-board');

class RotaryEncoder extends EventEmitter {
	constructor(config) {
		super();
		
		// Sanity check
		if (config.clkPin  === null || config.dsPin === null || config.swPin === null) {
			throw new Error("Rotary encoder requires all pins to be assigned in the config.")
		}

		// Bind update method to class so it is always
		// called in the correct context
		this.handleUpdate = this.handleUpdate.bind(this);
		this.handleInterrupt = this.handleInterrupt.bind(this);

		// Setup all our pins and pullUpDowns
		this.clkPin = config.clkPin;
		this.setPullUpDown('clk', config.clkPinPull);

		this.dsPin = config.dsPin;
		this.setPullUpDown('ds', config.dsPinPull);

		this.swPin = config.swPin;
		this.setPullUpDown('sw', config.swPinPull);

		// This was designed for a temperature range so we limit it here

		this.setRange(config.lowRange || 0);
		this.setRange(config.highRange || 212);
		this.setRange(config.rangeDefault || 70);

		// Make the objects for the rotary encoder
		this.clkCfg = {
			pin : this.clkPin,
			pullResistor : this.clkPinPull
		};

		this.dsCfg = {
			pin : this.dsPin,
			pullResistor : this.dsPinPull
		};

		this.swCfg = {
			pin : this.swPin,
			pullResistor : this.swPinPull
		};

		// Make the digital inputs to set the resistor
		this.clkDI = new gpio.DigitalInput(this.clkCfg);
		this.dsDI = new gpio.DigitalInput(this.dsCfg);
		this.swDI = new gpio.DigitalInput(this.swCfg);

		this.clkButton = onOff(
			this.resolveWiringPiToGPIO(this.clkDI.pins[0]),
			'in',
			'both'
		);

		this.dsButton = onOff(
			this.resolveWiringPiToGPIO(this.dsDI.pins[0]),
			'in',
			'both'
		);

		this.swButton = onOff(
			this.resolveWiringPiToGPIO(this.swDI.pins[0]),
			'in',
			'both'
		);

		this.value = 0;
		this.lastEncoded = 0;

		this.clkButton.watch(this.handleInterrupt);
		this.dsButton.watch(this.handleInterrupt);
		this.swButton.watch(this.handleInterrupt)
	}

	resolveWiringPiToGPIO(wiringPiPin) {
		try {
			return getPins()[wiringPiPin].pins.find( p => /GPIO/.test(p) ).replace('GPIO', '')
		} catch (e) {
			console.error('Cannot find GPIO number for pin: ', wiringPiPin);
			throw e;
		}
	}

	// Setters
	setRange(identifier, value) {
		identifier = identifier.toString().toLowerCase();

		switch(identifier) {
			case 'low':
				this.lowRange = value;
			 break;
			case 'hi':
				this.highRange = value;
			 break;
			case 'default':
				this.rangeDefault = value;
			 break;
		}
	}

	setPullUpDown(pin, value) {
		pin = pin.toString().toLowerCase();
		value = value.toString().toLowerCase();
		// assign the correct value
		value = (function() {
			switch (value) {
				case 'up'  : return gpio.PULL_UP;
				case 'down': return gpio.PULL_DOWN;
				case 'none': return gpio.PULL_NONE;
				default:     return null;
			}
		}(value));

		// assign the value to the correct pin
		switch(pin) {
			case 'clk':
				this.clkPinPull = value;
				break;
			case 'ds':
				this.dsPinPull = value;
				break;
			case 'sw':
				this.swPinPull = value;
				break;
		}
	}

	handleInterrupt() {
		this.handleUpdate(this.aPin.readSync(), this.bPin.readSync());
	}

	handleUpdate(aValue, bValue) {
		const MSB = aValue;
		const LSB = bValue;
		const lastValue = this.value;

		const encoded = (MSB << 1) | LSB;
		const sum = (this.lastEncoded << 2) | encoded;

		if (sum === 0b1101 || sum === 0b0100 || sum === 0b0010 || sum === 0b1011) {
			this.value++;
		}
		if (sum === 0b1110 || sum === 0b0111 || sum === 0b0001 || sum === 0b1000) {
			this.value--;
		}

		this.lastEncoded = encoded;

		if (lastValue !== this.value) {
			this.emit('change', { value: this.value });
		}
	}
}

module.exports = RotaryEncoder;