// @ts-check

$$.control.registerControl('rootPage', {

	template: "<div>\n    <input type=\"text\" bn-update=\"input\" bn-val=\"text\">\n    <label bn-text=\"text\"></label>\n    <custom-test bn-attr=\"{attr1: text}\"></custom-test>\n</div>",

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {


		customElements.define('custom-test', class extends HTMLElement {

			static get observedAttributes() {
				return ['attr1'];
			  }

			constructor() {
				super()

				const rootShadow = this.attachShadow({mode: "open"})
				this.label = document.createElement('label')
				const style = document.createElement('style')
				style.textContent= `
					label {
						border: 1px solid red;
						padding: 5px;
					}
				`
				rootShadow.appendChild(style)

				rootShadow.appendChild(this.label)
			}

			connectedCallback() {
				console.log('Custom square element added to page.');
			  }
			
			  disconnectedCallback() {
				console.log('Custom square element removed from page.');
			  }
			
			  adoptedCallback() {
				console.log('Custom square element moved to new page.');
			  }
			
			  attributeChangedCallback(name, oldValue, newValue) {
				console.log('Custom square element attributes changed.', name, oldValue, newValue);
				this.label.textContent = newValue
			  }
		})
		const ctrl = $$.viewController(elt, {
			data: {
				text: 'Hello',
				options: {
					attr1: 'toto',
					opt2: 10
				}
			},
			events: {
			}
		})

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2PlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgYm4tdmFsPVxcXCJ0ZXh0XFxcIj5cXG4gICAgPGxhYmVsIGJuLXRleHQ9XFxcInRleHRcXFwiPjwvbGFiZWw+XFxuICAgIDxjdXN0b20tdGVzdCBibi1hdHRyPVxcXCJ7YXR0cjE6IHRleHR9XFxcIj48L2N1c3RvbS10ZXN0PlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXG5cdFx0Y3VzdG9tRWxlbWVudHMuZGVmaW5lKCdjdXN0b20tdGVzdCcsIGNsYXNzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXG5cdFx0XHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcblx0XHRcdFx0cmV0dXJuIFsnYXR0cjEnXTtcblx0XHRcdCAgfVxuXG5cdFx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdFx0c3VwZXIoKVxuXG5cdFx0XHRcdGNvbnN0IHJvb3RTaGFkb3cgPSB0aGlzLmF0dGFjaFNoYWRvdyh7bW9kZTogXCJvcGVuXCJ9KVxuXHRcdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKVxuXHRcdFx0XHRjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcblx0XHRcdFx0c3R5bGUudGV4dENvbnRlbnQ9IGBcblx0XHRcdFx0XHRsYWJlbCB7XG5cdFx0XHRcdFx0XHRib3JkZXI6IDFweCBzb2xpZCByZWQ7XG5cdFx0XHRcdFx0XHRwYWRkaW5nOiA1cHg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRgXG5cdFx0XHRcdHJvb3RTaGFkb3cuYXBwZW5kQ2hpbGQoc3R5bGUpXG5cblx0XHRcdFx0cm9vdFNoYWRvdy5hcHBlbmRDaGlsZCh0aGlzLmxhYmVsKVxuXHRcdFx0fVxuXG5cdFx0XHRjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0N1c3RvbSBzcXVhcmUgZWxlbWVudCBhZGRlZCB0byBwYWdlLicpO1xuXHRcdFx0ICB9XG5cdFx0XHRcblx0XHRcdCAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDdXN0b20gc3F1YXJlIGVsZW1lbnQgcmVtb3ZlZCBmcm9tIHBhZ2UuJyk7XG5cdFx0XHQgIH1cblx0XHRcdFxuXHRcdFx0ICBhZG9wdGVkQ2FsbGJhY2soKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDdXN0b20gc3F1YXJlIGVsZW1lbnQgbW92ZWQgdG8gbmV3IHBhZ2UuJyk7XG5cdFx0XHQgIH1cblx0XHRcdFxuXHRcdFx0ICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDdXN0b20gc3F1YXJlIGVsZW1lbnQgYXR0cmlidXRlcyBjaGFuZ2VkLicsIG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG5cdFx0XHRcdHRoaXMubGFiZWwudGV4dENvbnRlbnQgPSBuZXdWYWx1ZVxuXHRcdFx0ICB9XG5cdFx0fSlcblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHRleHQ6ICdIZWxsbycsXG5cdFx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0XHRhdHRyMTogJ3RvdG8nLFxuXHRcdFx0XHRcdG9wdDI6IDEwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
