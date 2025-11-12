import {Relation, QueryBuilder, ColumnConstraint, ColumnConstrainer, Orderer} from "./components.js";


customElements.define("db-relation", Relation);
customElements.define("db-query-builder", QueryBuilder);
customElements.define("db-field-constraint", ColumnConstraint);
customElements.define("db-field-constrainer", ColumnConstrainer);
customElements.define("db-orderer", Orderer);


const queryBuilder = document.getElementById("query-builder");
const relation = document.getElementById("relation");
const relationPage = document.querySelector("#setPage");
const pagination = document.querySelector("#pagination")

document.getElementById("search").addEventListener("click", _ => {
    relation.query = queryBuilder.query;

    if (pagination.hasAttribute("hidden")) {
        pagination.toggleAttribute("hidden");
    }
    relationPage.value = relation.page + 1;
});

document.querySelector("#prevButton").addEventListener("click", _ => {
    relation.setPage(relation.page > 0 ? relation.page - 1 : relation.page)
    relationPage.value = relation.page + 1;
});
document.querySelector("#nextButton").addEventListener("click", _ => {
    relation.setPage(relation.page + 1)
    relationPage.value = relation.page + 1;
});
relationPage.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        const input = e.target;
        const pageNumber = Number(input.value);
        relation.setPage(Math.max(pageNumber - 1, 0));
        relationPage.value = relation.page + 1;
    }
});