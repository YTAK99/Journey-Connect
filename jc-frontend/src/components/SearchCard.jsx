export default function SearchCard(){
    return (
        <div className="max-w-screen-xl mx-auto px-4 py-4 grid grid-cols-3 gap-4 border-b border-gray-100">

            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                    <div className="relative">
                        <img className="w-full h-60 object-cover" src="/ex_3.jpg" alt="카드 이미지"/>
                    </div>
                    <div className="p-4">
                        <h5 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">
                            하늘
                        </h5>
                        <a href="#"
                           className="inline-flex items-center text-blue-600 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-blue-950">
                            Read more
                            <svg className="w-4 h-4 ms-1.5 rtl:rotate-180 -me-0.5" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M19 12H5m14 0-4 4m4-4-4-4"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                    <div className="relative">
                        <img className="w-full h-60 object-cover" src="/ex_2.jpg" alt="카드 이미지"/>
                    </div>
                    <div className="p-4">
                        <h5 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">
                            낙산사
                        </h5>
                        <a href="#"
                           className="inline-flex items-center text-blue-600 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-blue-950">
                            Read more
                            <svg className="w-4 h-4 ms-1.5 rtl:rotate-180 -me-0.5" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M19 12H5m14 0-4 4m4-4-4-4"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                    <div className="relative">
                        <img className="w-full h-60 object-cover" src="/ex_4.jpg" alt="카드 이미지"/>
                    </div>
                    <div className="p-4">
                        <h5 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">
                            낙산사 해수욕장
                        </h5>
                        <a href="#"
                           className="inline-flex items-center text-blue-600 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-blue-950">
                            Read more
                            <svg className="w-4 h-4 ms-1.5 rtl:rotate-180 -me-0.5" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M19 12H5m14 0-4 4m4-4-4-4"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

        </div>
    );
}