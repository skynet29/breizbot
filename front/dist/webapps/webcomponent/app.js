// @ts-check

$$.control.registerControl('rootPage', {

	template: "<div>\n    <input type=\"text\" bn-update=\"input\" bn-val=\"text\">\n    <label bn-text=\"text\"></label>\n    <custom-test bn-data=\"options\"></custom-test>\n</div>",

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
						border: 1px solid black;
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
					opt1: 'toto',
					opt2: 10
				}
			},
			events: {
			}
		})

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2PlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgYm4tdmFsPVxcXCJ0ZXh0XFxcIj5cXG4gICAgPGxhYmVsIGJuLXRleHQ9XFxcInRleHRcXFwiPjwvbGFiZWw+XFxuICAgIDxjdXN0b20tdGVzdCBibi1kYXRhPVxcXCJvcHRpb25zXFxcIj48L2N1c3RvbS10ZXN0PlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXG5cdFx0Y3VzdG9tRWxlbWVudHMuZGVmaW5lKCdjdXN0b20tdGVzdCcsIGNsYXNzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXG5cdFx0XHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcblx0XHRcdFx0cmV0dXJuIFsnYXR0cjEnXTtcblx0XHRcdCAgfVxuXG5cdFx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdFx0c3VwZXIoKVxuXG5cdFx0XHRcdGNvbnN0IHJvb3RTaGFkb3cgPSB0aGlzLmF0dGFjaFNoYWRvdyh7bW9kZTogXCJvcGVuXCJ9KVxuXHRcdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKVxuXHRcdFx0XHRjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcblx0XHRcdFx0c3R5bGUudGV4dENvbnRlbnQ9IGBcblx0XHRcdFx0XHRsYWJlbCB7XG5cdFx0XHRcdFx0XHRib3JkZXI6IDFweCBzb2xpZCBibGFjaztcblx0XHRcdFx0XHRcdHBhZGRpbmc6IDVweDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdGBcblx0XHRcdFx0cm9vdFNoYWRvdy5hcHBlbmRDaGlsZChzdHlsZSlcblxuXHRcdFx0XHRyb290U2hhZG93LmFwcGVuZENoaWxkKHRoaXMubGFiZWwpXG5cdFx0XHR9XG5cblx0XHRcdGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnQ3VzdG9tIHNxdWFyZSBlbGVtZW50IGFkZGVkIHRvIHBhZ2UuJyk7XG5cdFx0XHQgIH1cblx0XHRcdFxuXHRcdFx0ICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0N1c3RvbSBzcXVhcmUgZWxlbWVudCByZW1vdmVkIGZyb20gcGFnZS4nKTtcblx0XHRcdCAgfVxuXHRcdFx0XG5cdFx0XHQgIGFkb3B0ZWRDYWxsYmFjaygpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0N1c3RvbSBzcXVhcmUgZWxlbWVudCBtb3ZlZCB0byBuZXcgcGFnZS4nKTtcblx0XHRcdCAgfVxuXHRcdFx0XG5cdFx0XHQgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0N1c3RvbSBzcXVhcmUgZWxlbWVudCBhdHRyaWJ1dGVzIGNoYW5nZWQuJywgbmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKTtcblx0XHRcdFx0dGhpcy5sYWJlbC50ZXh0Q29udGVudCA9IG5ld1ZhbHVlXG5cdFx0XHQgIH1cblx0XHR9KVxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dGV4dDogJ0hlbGxvJyxcblx0XHRcdFx0b3B0aW9uczoge1xuXHRcdFx0XHRcdG9wdDE6ICd0b3RvJyxcblx0XHRcdFx0XHRvcHQyOiAxMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiJdfQ==
