<!--
 * @Author: hx24 83036406@qq.com
 * @Date: 2022-12-08 21:35:58
 * @LastEditors: hx24 83036406@qq.com
 * @LastEditTime: 2022-12-11 21:03:02
 * @FilePath: \three-map-test\src\components\Map\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
/*
 * @Description: 3d地图 
 * @Author: qinxp 
 * @Date: 2022-01-11 17:02:52 
 * @Last Modified by: qinxp
 * @Last Modified time: 2022-01-18 16:32:04
 */
 <template>
    <div ref="box" class="china-chart">
        <div id="provinceInfo"></div>
    </div>
</template>
<script>
import lineMap from './map'

export default {
    name: "Map",
    props: {
        tagData: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            mapObj: null
        };
    },
    watch: {
        tagData(v) {
            this.mapObj.setTag(v)
        }
    },
    mounted() {
        this.init();
    },
    beforeDestroy() {
        // this.mapObj.destroyed()
    },
    methods: {
        init() {
            this.mapObj = new lineMap(
                this.$refs.box,
                document.querySelector('#provinceInfo'),
                {
                    tagClick: this.tagClick.bind(this)
                }
            );
            this.mapObj.init();
            // this.mapObj.setTag(this.tagData)
        },
        tagClick(v) {
            this.$emit('tagClick', v)
        }
    },
};
</script>
<style lang="less" scoped>
.china-chart{
    position: relative;
    width: 100%;
    height: 100%;
    // mask-image: radial-gradient(yellow 60%, transparent 80%);
    #provinceInfo{
        position: absolute;
        color: #fff;
        user-select: none;
    }
}
</style>