import OrgChart from '@balkangraph/orgchart.js';
function Orgchart(props) {
    if (typeof window === 'object') {
    var chart = new OrgChart(document.getElementById("tree"), {
        nodeBinding: props.nodeBinding,
        nodes: props.nodes
    });
    }
    return (null)
}

var data = [
                { id: 1, name: 'Denny Curtis', title: 'CEO', img: 'https://cdn.balkan.app/shared/2.jpg' },
                { id: 2, pid: 1, name: 'Ashley Barnett', title: 'Sales Manager', img: 'https://cdn.balkan.app/shared/3.jpg' },
                { id: 3, pid: 1, name: 'Caden Ellison', title: 'Dev Manager', img: 'https://cdn.balkan.app/shared/4.jpg' },
                { id: 4, pid: 2, name: 'Elliot Patel', title: 'Sales', img: 'https://cdn.balkan.app/shared/5.jpg' },
                { id: 5, pid: 2, name: 'Lynn Hussain', title: 'Sales', img: 'https://cdn.balkan.app/shared/6.jpg' },
                { id: 6, pid: 3, name: 'Tanner May', title: 'Developer', img: 'https://cdn.balkan.app/shared/7.jpg' },
                { id: 7, pid: 3, name: 'Fran Parsons', title: 'Developer', img: 'https://cdn.balkan.app/shared/8.jpg' }
]

var nodeBinding = {
    field_0: "name",
    img_0: "img"
}

export default function HomePage() {

    return (
            <div>
            <div id="tree"></div>
            <Orgchart nodes={data}
            nodeBinding={nodeBinding} />
    </div>
    )
}