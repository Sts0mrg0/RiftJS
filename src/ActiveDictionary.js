(function() {

	var Map = rt.Map;
	var Set = rt.Set;
	var EventEmitter = rt.EventEmitter;

	/**
	 * @class Rift.ActiveDictionary
	 * @extends {Rift.EventEmitter}
	 *
	 * @param {?(Object|Rift.ActiveDictionary|undefined)} [data]
	 * @param {Object|boolean} [opts]
	 * @param {boolean} [opts.handleItemChanges=false]
	 */
	var ActiveDictionary = EventEmitter.extend('Rift.ActiveDictionary', /** @lends Rift.ActiveDictionary# */{
		_inner: null,
		_valueCounts: null,

		_handleItemChanges: false,

		constructor: function(data, opts) {
			EventEmitter.call(this);

			this._valueCounts = new Map();

			if (typeof opts == 'boolean') {
				opts = { handleItemChanges: opts };
			} else if (!opts) {
				opts = {};
			}

			var handleItemChanges = opts.handleItemChanges === true;

			if (handleItemChanges) {
				this._handleItemChanges = true;
			}

			if (data) {
				var inner = this._inner = Object.assign(
					Object.create(null),
					data instanceof ActiveDictionary ? data._inner : data
				);
				var valueCounts = this._valueCounts;

				for (var name in inner) {
					var value = inner[name];

					if (valueCounts.has(value)) {
						valueCounts.set(value, valueCounts.get(value) + 1);
					} else {
						valueCounts.set(value, 1);

						if (handleItemChanges && value instanceof EventEmitter) {
							value.on('change', this._onItemChange, this);
						}
					}
				}
			} else {
				this._inner = {};
			}
		},

		/**
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 */
		_onItemChange: function(evt) {
			this._handleEvent(evt);
		},

		/**
		 * Проверяет, имеет ли словарь запись с указанным именем.
		 *
		 * @param {string} name
		 * @returns {boolean}
		 */
		has: function(name) {
			return name in this._inner;
		},

		/**
		 * Получает значение записи.
		 *
		 * @param {string} name
		 * @returns {*}
		 */
		get: function(name) {
			return this._inner[name];
		},

		/**
		 * Устанавлиет значение записи.
		 *
		 * @param {string} name
		 * @param {*} value
		 * @returns {Rift.ActiveDictionary}
		 */
		set: function(name, value) {
			var values;

			if (typeof name == 'string') {
				values = {};
				values[name] = value;
			} else {
				values = name;
			}

			var inner = this._inner;
			var valueCounts = this._valueCounts;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValueSet = new Set();
			var removedValues = [];
			var addedValues = [];
			var diff = {
				$removedValues: removedValues,
				$addedValues: addedValues
			};

			for (name in values) {
				var hasName = name in inner;
				var oldValue = inner[name];
				var val = values[name];

				if (!hasName || !svz(oldValue, val)) {
					changed = true;

					if (hasName) {
						var oldValueCount = valueCounts.get(oldValue) - 1;

						if (oldValueCount) {
							valueCounts.set(oldValue, oldValueCount);
						} else {
							valueCounts.delete(oldValue);

							if (handleItemChanges && oldValue instanceof EventEmitter) {
								oldValue.off('change', this._onItemChange);
							}

							removedValueSet.add(oldValue);
						}
					}

					if (valueCounts.has(val)) {
						valueCounts.set(val, valueCounts.get(val) + 1);
					} else {
						valueCounts.set(val, 1);

						if (handleItemChanges && val instanceof EventEmitter) {
							val.on('change', this._onItemChange, this);
						}

						if (!removedValueSet.delete(val)) {
							addedValues.push(val);
						}
					}

					diff[name] = {
						type: hasName ? 'update' : 'add',
						oldValue: oldValue,
						value: val
					};

					inner[name] = val;
				}
			}

			if (changed) {
				removedValueSet.forEach(function(value) {
					removedValues.push(value);
				});

				this.emit('change', { diff: diff });
			}

			return this;
		},

		/**
		 * Удаляет записи.
		 *
		 * @param {...string} names
		 * @returns {Rift.ActiveDictionary}
		 */
		delete: function() {
			var inner = this._inner;
			var valueCounts = this._valueCounts;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValues = [];
			var diff = {
				$removedValues: removedValues,
				$addedValues: []
			};

			for (var i = 0, l = arguments.length; i < l; i++) {
				var name = arguments[i];

				if (name in inner) {
					changed = true;

					var value = inner[name];
					var valueCount = valueCounts.get(value) - 1;

					if (valueCount) {
						valueCounts.set(value, valueCount);
					} else {
						valueCounts.delete(value);

						if (handleItemChanges && value instanceof EventEmitter) {
							value.off('change', this._onItemChange);
						}

						removedValues.push(value);
					}

					diff[name] = {
						type: 'delete',
						oldValue: value,
						value: undef
					};

					delete inner[name];
				}
			}

			if (changed) {
				this.emit('change', { diff: diff });
			}

			return this;
		},

		/**
		 * @param {*} value
		 * @returns {boolean}
		 */
		contains: function(value) {
			return this._valueCounts.has(value);
		},

		/**
		 * Создает копию словаря.
		 *
		 * @returns {Rift.ActiveDictionary}
		 */
		clone: function() {
			return new this.constructor(this, { handleItemChanges: this._handleItemChanges });
		},

		/**
		 * Преобразует в объект.
		 *
		 * @returns {Object}
		 */
		toObject: function() {
			return Object.assign({}, this._inner);
		},

		/**
		 * @param {Object} data
		 * @param {Object} opts
		 */
		collectDumpObject: function(data, opts) {
			var inner = this._inner;

			for (var name in inner) {
				data[name] = inner[name];
			}

			if (this._handleItemChanges) {
				opts.handleItemChanges = true;
			}
		},

		/**
		 * @param {Object} data
		 */
		expandFromDumpObject: function(data) {
			this.set(data);
		},

		/**
		 * Уничтожает инстанс освобождая занятые им ресурсы.
		 */
		dispose: function() {
			if (this._handleItemChanges) {
				var onItemChange = this._onItemChange;

				this._valueCounts.forEach(function(value) {
					if (value instanceof EventEmitter) {
						value.off('change', onItemChange);
					}
				});
			}
		}
	});

	rt.ActiveDictionary = ActiveDictionary;

})();
