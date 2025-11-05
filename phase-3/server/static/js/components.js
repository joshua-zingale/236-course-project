class Row extends HTMLElement {
    constructor() {
        super();
        this.style.display = "block";
        this.shadow = this.attachShadow({mode: "open"});
        this._data = [];
    }

    connectedCallback() {
        this.render();
    }

    set data(value) {
        if (Array.isArray(value)) {
            this._data = value.map(item => removeHTML(item));
        } else {
            console.error('Row component: Data must be an array.');
            this._data = [];
        }
        this.render();
    }

    get data() {
        return this._data
    }

    render() {
        const fieldsHTML = this.data.map(item => 
            `<li>${item}</li>`
        ).join('');
        this.shadow.innerHTML = /*html*/`
        <style>
            ul {
                display: flex;
                padding: 10px;
                border: 1px solid #ccc;
                background-color: #fff;
                justify-content: space-evenly;
                list-style-type: none;
                margin: 0.5em;
            }

            ul:hover {
                background-color: #f7f7f7;
            }

            li {
                padding: 0 10px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                flex: 1;
            }
        </style>
        <ul>
            ${fieldsHTML}
        </ul>`;
    }
}

class RelationHeader extends HTMLElement {
    constructor() {
        super();
        this.style.display = "block";
        this.shadow = this.attachShadow({mode: "open"});

        /** @type {string[]} */
        this._columnNames = [];
    }

    connectedCallback() {
        this.render();
    }

    set columnNames(value) {
        if (Array.isArray(value)) {
            this._columnNames = value.map(item => removeHTML(item));
        } else {
            console.error('RelationHeader component: columnNames must be an array.');
            this._columnNames = [];
        }
        this.render();
    }

    get columnNames() {
        return this._columnNames
    }

    render() {
        const columnNames = this._columnNames.map(item => /*html*/`
            <li>${item}</li>
        `).join('');
        this.shadow.innerHTML = /*html*/`
        <style>
            ul {
                display: flex;
                padding: 10px;
                border: 1px solid #ccc;
                background-color: #f0f0f0;
                justify-content: space-evenly;
                list-style-type: none;
            }

            li {
                padding: 0 10px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                flex: 1;
                text-align:left;
            }
        </style>
        <ul>${columnNames}</ul>
        `;
    }


}

class Relation extends HTMLElement {
    constructor() {
        super();
        this.style.display = "block";
        this.shadow = this.attachShadow({mode: "open"});

        /** @type {Query | null} */
        this._query = null;
    }

    connectedCallback() {
        this.render();
    }

    set query(value) {
        this._query = value;
        this.render();
    }

    get query() {
        return this._query
    }

    async render() {
        const relation = document.createElement("div");

        this.shadow.innerHTML = ``;
        this.shadow.appendChild(relation)

        if (this.query === null) {
            relation.appendChild(getRelationHeader([]));
            return
        }
        
        relation.appendChild(getRelationHeader(this.query.columns));
        const res = await fetchQueryResult(this.query);
        const rowData = res.rows.map(row => this.query.columns.map(column => row[column]));
        rowData.forEach(row => relation.appendChild(getRow(row)));
    }


}

function removeHTML(text) {
    const decoder = document.createElement("div");
    decoder.textContent = text;
    return decoder.textContent || "";
}

function getRow(data) {
    const row = new Row();
    row.data = data;
    return row;
}

function getRelationHeader(columns) {
    const header = new RelationHeader();
    header.columnNames = columns;
    return header;
}

customElements.define("db-row", Row)
customElements.define("db-relation-header", RelationHeader)

customElements.define("db-relation", Relation)